"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/today");

  if (!email || !password) {
    return { error: "Введите почту и пароль" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // В лог — настоящую причину, пользователю — понятную формулировку.
    // Без этого «неверная почта или пароль» скрывает и неподтверждённую почту,
    // и отключённый вход по паролю, и разбираться приходится вслепую.
    console.error("Ошибка входа:", { code: error.code, message: error.message });

    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Почта не подтверждена. Руководителю нужно подтвердить её в Supabase (Auto Confirm User).",
      };
    }

    return { error: "Неверная почта или пароль" };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/today");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
