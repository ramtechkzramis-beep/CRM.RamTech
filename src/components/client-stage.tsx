"use client";

import { useState, useTransition } from "react";
import { Check, Route, Lock, AlertTriangle } from "lucide-react";
import { updateStage } from "@/app/(app)/clients/actions";
import type { ClientWithSegment } from "@/lib/client-types";
import {
  STAGES,
  STAGE_DESCRIPTIONS,
  STAGE_DOTS,
  STAGE_LABELS,
  stageIndex,
  type ProjectStage,
} from "@/lib/stages";

/**
 * Этап проекта — дорожка из пяти шагов.
 *
 * Переключают только руководитель и разработчик, и только через подтверждение:
 * случайный клик по «Одобрен» запускает ППС и дату продления, а клик назад
 * откатывает проект. Такое не должно происходить от промаха мышью.
 */
export function ClientStage({
  client,
  canManage,
}: {
  client: ClientWithSegment;
  canManage: boolean;
}) {
  const [confirming, setConfirming] = useState<ProjectStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = client.stage;
  const currentIndex = current ? stageIndex(current) : -1;

  function apply(stage: ProjectStage) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("client_id", client.id);
      formData.set("stage", stage);

      const result = await updateStage({ error: null }, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setConfirming(null);
      }
    });
  }

  // Переход на «Одобрен» запускает ППС — об этом надо предупредить отдельно.
  const startsPps =
    confirming === "approved" && !client.cycle_start_date;
  // Шаг назад откатывает проект — тоже не рядовое действие.
  const isBackwards =
    confirming !== null && currentIndex > -1 && stageIndex(confirming) < currentIndex;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Route className="size-4 text-slate-400" />
          Этап проекта
        </h2>
        <div className="flex items-center gap-3">
          {!canManage && (
            <span
              title="Менять этап могут руководитель и разработчик"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400"
            >
              <Lock className="size-3" />
              только просмотр
            </span>
          )}
          {client.stage_updated_at && (
            // Долго висящий этап — сигнал: проект встал.
            <span className="text-xs text-slate-400">
              с {new Date(client.stage_updated_at).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      </div>

      <ol className="space-y-1">
        {STAGES.map((stage, index) => {
          const isCurrent = stage === current;
          const isPassed = currentIndex > index;

          const content = (
            <>
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                  isCurrent
                    ? STAGE_DOTS[stage]
                    : isPassed
                      ? "bg-emerald-500"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isPassed ? <Check className="size-3" /> : index + 1}
              </span>

              <span className="min-w-0">
                <span
                  className={`block text-sm ${
                    isCurrent
                      ? "font-semibold text-slate-900"
                      : isPassed
                        ? "text-slate-500"
                        : "text-slate-700"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
                <span className="block text-xs text-slate-500">
                  {STAGE_DESCRIPTIONS[stage]}
                </span>
              </span>
            </>
          );

          // Без прав рисуем обычный блок, а не отключённую кнопку: серая
          // кнопка выглядит как поломка, хотя человек просто смотрит.
          if (!canManage) {
            return (
              <li
                key={stage}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex items-start gap-3 rounded-lg border p-2.5 ${
                  isCurrent ? "border-brand bg-brand-soft" : "border-transparent"
                }`}
              >
                {content}
              </li>
            );
          }

          return (
            <li key={stage}>
              <button
                type="button"
                onClick={() => {
                  if (stage === current) return;
                  setError(null);
                  setConfirming(stage);
                }}
                disabled={pending}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition disabled:opacity-60 ${
                  isCurrent
                    ? "border-brand bg-brand-soft"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ol>

      {canManage && !current && (
        <p className="mt-3 text-xs text-slate-500">
          Этап не выбран. Нажмите на нужный.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Перевести проект на этап «{STAGE_LABELS[confirming]}»?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {STAGE_DESCRIPTIONS[confirming]}
            </p>

            <p className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">
                {current ? STAGE_LABELS[current] : "Без этапа"}
              </span>
              <span className="text-slate-300">→</span>
              <span className="font-medium text-slate-900">
                {STAGE_LABELS[confirming]}
              </span>
            </p>

            {startsPps && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  С этого дня начнётся ППС1 и отсчёт до продления. Отменить
                  автоматически нельзя — дату придётся править вручную.
                </span>
              </p>
            )}

            {isBackwards && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>Это возврат проекта на предыдущий этап.</span>
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => apply(confirming)}
                disabled={pending}
                className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
              >
                {pending ? "Переводим…" : "Перевести"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
