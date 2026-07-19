"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { closeTask } from "@/app/(app)/today/actions";
import {
  OUTCOMES_BY_TYPE,
  OUTCOME_LABELS,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
  type TaskWithRelations,
} from "@/lib/task-types";

const TONE_ACTIVE: Record<"good" | "bad" | "neutral", string> = {
  good: "border-emerald-600 bg-emerald-600 text-white",
  bad: "border-red-600 bg-red-600 text-white",
  neutral: "border-brand bg-gradient-to-r from-brand to-brand-dark text-white",
};

export function CloseTaskForm({ task }: { task: TaskWithRelations }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const outcomes = OUTCOMES_BY_TYPE[task.type];

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await closeTask({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
        setOutcome("");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Завершить задачу"
        title="Завершить задачу"
        className="flex size-5 items-center justify-center rounded border border-slate-300 bg-white text-transparent transition hover:border-brand hover:text-slate-300"
      >
        <Check className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Чем закончилось?</h3>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          {TASK_TYPE_LABELS[task.type]}: {task.title}
          {task.client && ` — ${task.client.name}`}
        </p>

        <form action={handleAction} className="space-y-4">
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="client_id" value={task.client_id ?? ""} />
          <input type="hidden" name="outcome" value={outcome} />

          <div className="flex flex-wrap gap-2">
            {outcomes.map((item) => {
              const isActive = outcome === item;
              const tone = OUTCOME_TONE[item];

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setOutcome(item)}
                  aria-pressed={isActive}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    isActive
                      ? TONE_ACTIVE[tone]
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {OUTCOME_LABELS[item]}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`note-${task.id}`}
              className="text-sm font-medium text-slate-700"
            >
              Комментарий
            </label>
            <textarea
              id={`note-${task.id}`}
              name="outcome_note"
              rows={3}
              placeholder="Что обсудили, о чём договорились"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
              disabled={pending || !outcome}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Завершить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
