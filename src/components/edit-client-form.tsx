"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateClient } from "@/app/(app)/clients/actions";
import { BUSINESS_SIZE_LABELS, type ClientWithSegment } from "@/lib/client-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function EditClientForm({ client }: { client: ClientWithSegment }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await updateClient({ error: null }, formData);
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
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil className="size-3.5" />
        Редактировать
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Редактирование компании
        </h2>

        <form action={handleAction} className="space-y-4">
          <input type="hidden" name="client_id" value={client.id} />

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Компания *
            </label>
            {/* Названия из выгрузок бывают длинными и склеенными — нужно место,
                чтобы человек мог их спокойно переписать. */}
            <textarea
              id="name"
              name="name"
              required
              rows={2}
              defaultValue={client.name}
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="city" className="text-sm font-medium text-slate-700">
                Город
              </label>
              <input
                id="city"
                name="city"
                defaultValue={client.city ?? ""}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="business_size" className="text-sm font-medium text-slate-700">
                Размер бизнеса
              </label>
              <select
                id="business_size"
                name="business_size"
                defaultValue={client.business_size ?? ""}
                className={FIELD_CLASS}
              >
                <option value="">Не указан</option>
                {(Object.keys(BUSINESS_SIZE_LABELS) as (keyof typeof BUSINESS_SIZE_LABELS)[]).map(
                  (size) => (
                    <option key={size} value={size}>
                      {BUSINESS_SIZE_LABELS[size]}
                    </option>
                  ),
                )}
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
              defaultValue={client.source ?? ""}
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Заметки
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={client.notes ?? ""}
              className={FIELD_CLASS}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
