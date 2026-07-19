"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn, type LoginState } from "./actions";
import { LogoMark } from "@/components/logo";

const ERROR_MESSAGES: Record<string, string> = {
  "no-profile": "Профиль сотрудника не найден. Обратитесь к руководителю.",
  inactive: "Доступ отключён. Обратитесь к руководителю.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";
  const urlError = searchParams.get("error");

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    { error: urlError ? ERROR_MESSAGES[urlError] ?? null : null },
  );

  return (
    <form action={formAction} className="w-full max-w-sm space-y-5">
      <div className="space-y-3">
        <LogoMark className="size-12 text-brand-light" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            RaM<span className="text-brand-light">Tech</span>
          </h1>
          <p className="text-sm text-slate-400">Вход для сотрудников</p>
        </div>
      </div>

      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
          Рабочая почта
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-2.5 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    // Вход — на чёрном, как логотип. Фиолетовое свечение за формой:
    // единственное место, где можно позволить себе эффект, — дальше идёт
    // рабочий интерфейс, там не до украшений.
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
      />
      <div className="relative z-10 w-full max-w-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
