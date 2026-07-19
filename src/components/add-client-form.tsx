"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createColdClient } from "@/app/(app)/clients/actions";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function AddClientForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Закрываем форму в обработчике, а не в useEffect по результату:
  // эффект, дёргающий setState, гоняет лишние рендеры.
  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await createColdClient({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
      >
        <Plus className="size-4" />
        Добавить клиента
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Новый клиент в холодную базу
        </h2>

        <form action={handleAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Компания *
            </label>
            <input id="name" name="name" required className={FIELD_CLASS} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="contact_person" className="text-sm font-medium text-slate-700">
                Контактное лицо
              </label>
              <input id="contact_person" name="contact_person" className={FIELD_CLASS} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Телефон
              </label>
              <input id="phone" name="phone" className={FIELD_CLASS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="city" className="text-sm font-medium text-slate-700">
                Город
              </label>
              <input id="city" name="city" className={FIELD_CLASS} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Почта
              </label>
              <input id="email" name="email" type="email" className={FIELD_CLASS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="business_size" className="text-sm font-medium text-slate-700">
                Размер бизнеса
              </label>
              <select id="business_size" name="business_size" className={FIELD_CLASS} defaultValue="">
                <option value="">Не указан</option>
                <option value="small">Малый</option>
                <option value="medium">Средний</option>
                <option value="large">Крупный</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="source" className="text-sm font-medium text-slate-700">
              Источник
            </label>
            <input
              id="source"
              name="source"
              placeholder="Например: входящая заявка, конференция, рекомендация"
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Заметки
            </label>
            <textarea id="notes" name="notes" rows={3} className={FIELD_CLASS} />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
