"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canManageKnowledge } from "@/lib/types";
import { isKnowledgeAudience, isKnowledgeCategory } from "@/lib/knowledge-types";

export type ArticleState = { error: string | null; ok?: boolean };

/**
 * Потолок хранилища Supabase на нашем тарифе. Больше него файл не примет
 * само хранилище, поэтому проверяем заранее и говорим человеку словами.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

export type UploadTicket =
  | { error: string; path?: undefined; token?: undefined }
  | { error: null; path: string; token: string };

/**
 * Разрешение на загрузку файла прямо из браузера в хранилище.
 *
 * Раньше файл шёл телом server action, через наш сервер. У площадки, где
 * крутится CRM, тело запроса ограничено несколькими мегабайтами, и
 * презентация на 10-20 МБ падала с невнятной ошибкой. Теперь сервер только
 * проверяет права и выдаёт одноразовую ссылку, а байты идут в хранилище
 * напрямую — мимо этого ограничения.
 *
 * Права проверяет и выдача ссылки, и политика самого хранилища: ссылку
 * выписывает залогиненный пользователь, а не сервисный ключ.
 */
export async function createUploadTicket(
  category: string,
  fileName: string,
  fileSize: number,
): Promise<UploadTicket> {
  const profile = await requireProfile();

  if (!canManageKnowledge(profile.role)) {
    return { error: "Добавлять материалы может только руководитель или руководитель отдела" };
  }
  if (!isKnowledgeCategory(category)) return { error: "Выберите категорию" };
  if (!Number.isFinite(fileSize) || fileSize <= 0) return { error: "Файл пустой" };
  if (fileSize > MAX_FILE_SIZE) return { error: "Файл больше 50 МБ" };

  // Имя файла из uuid, а не из оригинального: кириллица и пробелы в путях
  // Storage ломают ссылки, а одинаковые названия перетирали бы друг друга.
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${category}/${crypto.randomUUID()}.${extension}`;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("knowledge-files")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { error: `Не удалось начать загрузку: ${error?.message ?? "нет ответа"}` };
  }

  return { error: null, path: data.path, token: data.token };
}

export async function createArticle(
  _prevState: ArticleState,
  formData: FormData,
): Promise<ArticleState> {
  const profile = await requireProfile();

  // Права проверяем и здесь, а не только прячем кнопку: server action
  // можно вызвать в обход интерфейса.
  if (!canManageKnowledge(profile.role)) {
    return { error: "Добавлять материалы может только руководитель или руководитель отдела" };
  }

  const category = String(formData.get("category") ?? "");
  const audienceRaw = String(formData.get("audience") ?? "all");
  const audience = isKnowledgeAudience(audienceRaw) ? audienceRaw : "all";
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  // Файл к этому моменту уже лежит в хранилище: браузер загрузил его по
  // одноразовой ссылке из createUploadTicket, сюда приходит только путь.
  const storagePath = String(formData.get("storage_path") ?? "").trim() || null;
  const fileName = String(formData.get("file_name") ?? "").trim() || null;
  const fileSize = Number(formData.get("file_size") ?? 0) || null;
  const mimeType = String(formData.get("mime_type") ?? "").trim() || null;

  if (!isKnowledgeCategory(category)) return { error: "Выберите категорию" };
  if (!title) return { error: "Укажите название" };

  if (!content && !storagePath) {
    return { error: "Добавьте текст или прикрепите файл" };
  }
  if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
    return { error: "Нужен PDF, Word, PowerPoint или текстовый файл" };
  }

  const supabase = await createClient();

  // Новый материал уходит в конец своей категории, а не всегда на нулевую
  // позицию: иначе он встал бы перед уже выстроенной последовательностью
  // (например, перед скриптами по этапам сделки).
  const { data: last } = await supabase
    .from("knowledge_articles")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("knowledge_articles").insert({
    category,
    title,
    content: content || null,
    storage_path: storagePath,
    file_name: storagePath ? fileName : null,
    file_size: storagePath ? fileSize : null,
    mime_type: storagePath ? mimeType : null,
    author_id: profile.id,
    audience,
    sort_order: nextSortOrder,
  });

  if (error) {
    if (storagePath) {
      // Файл уже в хранилище, а записи нет — убираем за собой, иначе
      // в бакете копятся файлы, на которые никто не ссылается.
      await supabase.storage.from("knowledge-files").remove([storagePath]);
    }
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath("/knowledge");
  return { error: null, ok: true };
}

export async function updateArticle(
  _prevState: ArticleState,
  formData: FormData,
): Promise<ArticleState> {
  const profile = await requireProfile();
  if (!canManageKnowledge(profile.role)) {
    return { error: "Редактировать материалы может только руководитель или руководитель отдела" };
  }

  const articleId = String(formData.get("article_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const audienceRaw = String(formData.get("audience") ?? "all");
  const audience = isKnowledgeAudience(audienceRaw) ? audienceRaw : "all";
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!articleId) return { error: "Материал не найден" };
  if (!isKnowledgeCategory(category)) return { error: "Выберите категорию" };
  if (!title) return { error: "Укажите название" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_articles")
    .update({
      category,
      audience,
      title,
      content: content || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (error) return { error: `Не удалось сохранить: ${error.message}` };

  revalidatePath("/knowledge");
  return { error: null, ok: true };
}

export async function deleteArticle(formData: FormData) {
  const profile = await requireProfile();
  if (!canManageKnowledge(profile.role)) return;

  const articleId = String(formData.get("article_id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");

  if (!articleId) return;

  const supabase = await createClient();

  await supabase.from("knowledge_articles").delete().eq("id", articleId);

  if (storagePath) {
    await supabase.storage.from("knowledge-files").remove([storagePath]);
  }

  revalidatePath("/knowledge");
}
