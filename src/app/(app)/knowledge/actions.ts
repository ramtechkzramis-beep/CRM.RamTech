"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canManageKnowledge } from "@/lib/types";
import { isKnowledgeCategory } from "@/lib/knowledge-types";

export type ArticleState = { error: string | null; ok?: boolean };

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

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
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const file = formData.get("file");

  if (!isKnowledgeCategory(category)) return { error: "Выберите категорию" };
  if (!title) return { error: "Укажите название" };

  const hasFile = file instanceof File && file.size > 0;
  if (!content && !hasFile) {
    return { error: "Добавьте текст или прикрепите файл" };
  }

  if (hasFile && file.size > MAX_FILE_SIZE) {
    return { error: "Файл больше 20 МБ" };
  }
  if (hasFile && file.type && !ALLOWED_MIME.includes(file.type)) {
    return { error: "Нужен PDF, Word, PowerPoint или текстовый файл" };
  }

  const supabase = await createClient();

  let storagePath: string | null = null;
  if (hasFile) {
    // Имя файла из uuid, а не из оригинального: кириллица и пробелы в путях
    // Storage ломают ссылки, а одинаковые названия перетирали бы друг друга.
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    storagePath = `${category}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      return { error: `Не удалось загрузить файл: ${uploadError.message}` };
    }
  }

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
    file_name: hasFile ? file.name : null,
    file_size: hasFile ? file.size : null,
    mime_type: hasFile ? file.type || null : null,
    author_id: profile.id,
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
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!articleId) return { error: "Материал не найден" };
  if (!isKnowledgeCategory(category)) return { error: "Выберите категорию" };
  if (!title) return { error: "Укажите название" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_articles")
    .update({ category, title, content: content || null, updated_at: new Date().toISOString() })
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
