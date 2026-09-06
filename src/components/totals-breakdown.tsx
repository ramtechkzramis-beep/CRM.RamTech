"use client";

import { useState } from "react";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  OUTCOMES_BY_TYPE,
  type TaskOutcome,
  type TaskType,
} from "@/lib/task-types";
import type { DoneAction, SummaryTotals } from "@/lib/summary-types";

/**
 * Сколько раз каждый исход встретился у задач этого типа за период.
 * Идём не только по OUTCOMES_BY_TYPE[type] (актуальный набор для выбора
 * при завершении задачи) — «Не пришли» убрали из выбора для встреч, но
 * в старых закрытых задачах он ещё может быть, и тогда его не должно
 * тихо пропасть из разбивки.
 */
function outcomeBreakdown(
  actions: DoneAction[],
  type: TaskType,
): { outcome: TaskOutcome; count: number }[] {
  const counts = new Map<TaskOutcome, number>();
  for (const action of actions) {
    if (action.type !== type || !action.outcome) continue;
    counts.set(action.outcome, (counts.get(action.outcome) ?? 0) + 1);
  }

  const known = OUTCOMES_BY_TYPE[type];
  const extra = [...counts.keys()].filter((outcome) => !known.includes(outcome));

  return [...known, ...extra].map((outcome) => ({
    outcome,
    count: counts.get(outcome) ?? 0,
  }));
}

/**
 * Плитки «Итого» — кликабельные: выбор типа раскрывает разбивку по
 * результатам (дозвонился/не дозвонился/отказ и т. д.), чтобы по одной
 * цифре «Прозвон: 49» не приходилось гадать, чем эти звонки кончились.
 */
export function TotalsBreakdown({
  totals,
  actions,
}: {
  totals: SummaryTotals;
  actions: DoneAction[];
}) {
  const [selected, setSelected] = useState<TaskType | null>(null);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-5">
        {TASK_TYPES.map((type) => {
          const isActive = selected === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(isActive ? null : type)}
              aria-pressed={isActive}
              className={`rounded-xl border bg-white p-4 text-left transition ${
                isActive
                  ? "border-brand ring-1 ring-brand"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TASK_TYPE_STYLES[type]}`}
              >
                {TASK_TYPE_LABELS[type]}
              </span>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totals[type]}</p>
            </button>
          );
        })}
        <div className="rounded-xl border border-brand bg-gradient-to-r from-brand to-brand-dark p-4">
          <span className="text-xs font-medium text-slate-300">Всего действий</span>
          <p className="mt-2 text-2xl font-semibold text-white">{totals.total}</p>
        </div>
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-900">
            Результаты: {TASK_TYPE_LABELS[selected]}
          </p>
          <div className="flex flex-wrap gap-3">
            {outcomeBreakdown(actions, selected).map(({ outcome, count }) => (
              <div
                key={outcome}
                className="min-w-[7rem] rounded-lg border border-slate-200 px-3 py-2"
              >
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[outcome]]}`}
                >
                  {OUTCOME_LABELS[outcome]}
                </span>
                <p className="mt-1 text-lg font-semibold text-slate-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
