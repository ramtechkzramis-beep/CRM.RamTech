"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type CommentState = { error: string | null; ok?: boolean };

/**
 * Добавить комментарий может любой, кто видит клиента, — это ежедневная
 * работа менеджера с лидом, RLS (client_comments_insert) ограничивает
 * это ровно тем же кругом, что и видимость самого клиента.
 */
export async function addComment(
  _prevState: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const profile = await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  if (!clientId) return { error: "Клиент не указан" };
  if (!text) return { error: "Введите текст комментария" };

  const supabase = await createClient();
  const { error } = await supabase.from("client_comments").insert({
    client_id: clientId,
    author_id: profile.id,
    text,
  });

  if (error) return { error: `Не удалось сохранить: ${error.message}` };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/cold");
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/** Удалить может автор (поправить опечатку) или руководитель — проверяет RLS. */
export async function deleteComment(formData: FormData) {
  await requireProfile();

  const commentId = String(formData.get("comment_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!commentId) return;

  const supabase = await createClient();
  await supabase.from("client_comments").delete().eq("id", commentId);

  revalidatePath(`/clients/${clientId}`);
}
