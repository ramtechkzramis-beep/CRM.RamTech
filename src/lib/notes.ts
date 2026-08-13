import { createClient } from "@/lib/supabase/server";

/** Личный черновик пользователя — приватный, RLS отдаёт только свою строку. */
export async function getMyNotes(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("personal_notes")
    .select("content")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.content ?? "";
}
