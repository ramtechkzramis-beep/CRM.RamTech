"use client";

import { useState, useTransition } from "react";
import { Pencil, Timer } from "lucide-react";
import { updateCycleStart } from "@/app/(app)/clients/actions";
import type { ClientWithSegment } from "@/lib/client-types";
import { formatDateRu } from "@/lib/dates";
import { STAGE_LABELS } from "@/lib/stages";

/**
 * Сроки ППС: когда начался цикл и когда продление.
 *
 * Пока проект не одобрен, ППС не идёт — вместо цифр объясняем, чего ждём.
 * Иначе клиент на разработке показывался бы как ППС1, хотя услугой
 * ещё не пользуется.
 */
export function ClientPps({ client }: { client: ClientWithSegment }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await updateCycleStart({ error: null }, formData);
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (!client.cycle_start_date) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Timer className="size-4 text-slate-400" />
          Сроки ППС
        </h2>
        <p className="text-sm text-slate-600">
          ППС ещё не начался. Отсчёт стартует автоматически, когда проект дойдёт
          до этапа «Одобрен» — с этого дня клиент пользуется услугой.
        </p>
        {client.stage && (
          <p className="mt-2 text-xs text-slate-500">
            Сейчас проект на этапе «{STAGE_LABELS[client.stage]}».
            {client.contract_signed_date &&
              ` Договор подписан ${formatDateRu(client.contract_signed_date)}.`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Месяц работы</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {client.month_in_cycle ?? "—"}
          <span className="ml-1 text-sm font-normal text-slate-400">
            из {client.contract_months}
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              ППС начался
            </p>
            <p className="mt-1 text-lg font-medium text-slate-900">
              {formatDateRu(client.cycle_start_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
            aria-label="Изменить дату начала ППС"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Продление</p>
        <p className="mt-1 text-lg font-medium text-slate-900">
          {formatDateRu(client.renewal_date)}
        </p>
        {client.days_to_renewal !== null && (
          <p
            className={`mt-0.5 text-xs ${
              client.days_to_renewal < 0
                ? "font-medium text-red-700"
                : client.days_to_renewal <= 30
                  ? "font-medium text-amber-700"
                  : "text-slate-500"
            }`}
          >
            {client.days_to_renewal < 0
              ? `просрочено на ${Math.abs(client.days_to_renewal)} дн.`
              : `через ${client.days_to_renewal} дн.`}
          </p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Дата начала ППС
            </h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              Обычно ставится автоматически при одобрении проекта. Поправьте,
              если проект одобрили раньше, чем отметили в системе.
            </p>

            <form action={handleAction} className="space-y-4">
              <input type="hidden" name="client_id" value={client.id} />

              <input
                name="cycle_start_date"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={client.cycle_start_date}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />

              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                От этой даты считаются сегмент ППС и дата продления.
              </p>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
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
      )}
    </div>
  );
}
