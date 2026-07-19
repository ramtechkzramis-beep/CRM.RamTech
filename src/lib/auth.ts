import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Профиль текущего сотрудника. Все защищённые страницы обязаны звать именно её,
 * а не читать auth-пользователя напрямую: без профиля роль неизвестна, а роль
 * определяет и меню, и то, какие клиенты вообще вернутся из базы.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  if (!profile.is_active) {
    redirect("/login?error=inactive");
  }

  return profile as Profile;
}
