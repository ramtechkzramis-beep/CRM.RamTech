"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { updateLoyalty } from "@/app/(app)/clients/actions";
import {
  LOYALTY_CHANCE,
  LOYALTY_DESCRIPTIONS,
  LOYALTY_DOTS,
  LOYALTY_LABELS,
  LOYALTY_LEVELS,
  LOYALTY_STYLES,
  type ClientWithSegment,
  type LoyaltyLevel,
} from "@/lib/client-types";

const ACTIVE_STYLES: Record<LoyaltyLevel, string> = {
  green: "border-emerald-600 bg-emerald-50",
  yellow: "border-amber-500 bg-amber-50",
  red: "border-red-600 bg-red-50",
};

/** Компактный значок для таблиц и списков. */
export function LoyaltyDot({ loyalty }: { loyalty: LoyaltyLevel | null }) {
  if (!loyalty) {
    return (
      <span
        title="Лояльность не оценена"
        className="inline-block size-2.5 rounded-full border border-slate-300 bg-white"
      />
    );
  }

  return (
    <span
      title={`${LOYALTY_LABELS[loyalty]} — ${LOYALTY_DESCRIPTIONS[loyalty]}. Вероятность продления ${LOYALTY_CHANCE[loyalty]}`}
      className={`inline-block size-2.5 rounded-full ${LOYALTY_DOTS[loyalty]}`}
    />
  );
}

export function ClientLoyalty({ client }: { client: ClientWithSegment }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LoyaltyLevel | "">(client.loyalty ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await updateLoyalty({ error: null }, formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Heart className="size-4 text-slate-400" />
          Лояльность клиента
        </h2>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {client.loyalty ? "Изменить" : "Оценить"}
        </button>
      </div>

      {client.loyalty ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${LOYALTY_STYLES[client.loyalty]}`}
            >
              <span className={`size-2 rounded-full ${LOYALTY_DOTS[client.loyalty]}`} />
              {LOYALTY_LABELS[client.loyalty]}
            </span>
            <span className="text-sm text-slate-600">
              {LOYALTY_DESCRIPTIONS[client.loyalty]}
            </span>
          </div>

          <p className="text-sm text-slate-500">
            Вероятность продления и допродаж: {LOYALTY_CHANCE[client.loyalty]}
          </p>

          {client.loyalty_note && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {client.loyalty_note}
            </p>
          )}

          {client.loyalty_updated_at && (
            // Оценка устаревает: полгода назад клиент был зелёным, а сейчас?
            <p className="text-xs text-slate-400">
              Оценка от{" "}
              {new Date(client.loyalty_updated_at).toLocaleDateString("ru-RU")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Лояльность не оценена. Это оценка того, насколько клиент доволен нами.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Оценка лояльности</h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              Насколько клиент доволен работой с нами
            </p>

            <form action={handleAction} className="space-y-4">
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="loyalty" value={selected} />

              {/* Расшифровка прямо в форме: новый сотрудник не должен гадать,
                  чем жёлтый отличается от красного. */}
              <div className="space-y-2">
                {LOYALTY_LEVELS.map((level) => {
                  const isActive = selected === level;

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelected(level)}
                      aria-pressed={isActive}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        isActive
                          ? ACTIVE_STYLES[level]
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`mt-1 size-3 shrink-0 rounded-full ${LOYALTY_DOTS[level]}`}
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">
                          {LOYALTY_LABELS[level]} — {LOYALTY_DESCRIPTIONS[level]}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Вероятность продления и допродаж: {LOYALTY_CHANCE[level]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="loyalty_note"
                  className="text-sm font-medium text-slate-700"
                >
                  Почему такая оценка
                </label>
                <textarea
                  id="loyalty_note"
                  name="loyalty_note"
                  rows={3}
                  defaultValue={client.loyalty_note ?? ""}
                  placeholder="Что говорит клиент, чем доволен или недоволен"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={pending || !selected}
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
