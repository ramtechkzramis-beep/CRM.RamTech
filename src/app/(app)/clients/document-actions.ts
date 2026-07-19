"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canSeeDashboard } from "@/lib/types";

export type DocumentState = { error: string | null; ok?: boolean };

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export async function uploadDocument(
  _prevState: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const profile = await requireProfile();

  // Права проверяем и здесь, а не только прячем кнопку: server action
  // можно вызвать в обход интерфейса.
  if (!canSeeDashboard(profile.role)) {
    return { error: "Загружать документы может только руководитель" };
  }

  const clientId = String(formData.get("client_id") ?? "");
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "contract");

  if (!clientId) return { error: "Клиент не указан" };
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите файл" };

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Файл больше 20 МБ" };
  }

  if (file.type && !ALLOWED_MIME.includes(file.type)) {
    return { error: "Нужен PDF, фото скана (JPG, PNG) или документ Word" };
  }

  const supabase = await createClient();

  // Имя файла из uuid, а не из оригинального: кириллица и пробелы в путях
  // Storage ломают ссылки, а одинаковые названия перетирали бы друг друга.
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${clientId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: `Не удалось загрузить файл: ${uploadError.message}` };
  }

  const { error } = await supabase.from("client_documents").insert({
    client_id: clientId,
    kind,
    title: title || file.name,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: profile.id,
  });

  if (error) {
    // Файл уже в хранилище, а записи нет — убираем за собой,
    // иначе в бакете копятся файлы, на которые никто не ссылается.
    await supabase.storage.from("client-documents").remove([storagePath]);
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function deleteDocument(formData: FormData) {
  const profile = await requireProfile();
  if (!canSeeDashboard(profile.role)) return;

  const documentId = String(formData.get("document_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");

  if (!documentId) return;

  const supabase = await createClient();

  await supabase.from("client_documents").delete().eq("id", documentId);

  if (storagePath) {
    await supabase.storage.from("client-documents").remove([storagePath]);
  }

  revalidatePath(`/clients/${clientId}`);
}
