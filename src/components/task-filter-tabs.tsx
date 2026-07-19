"use client";

import { useState } from "react";
import { TaskItem } from "@/components/task-item";
import { OUTCOME_TONE, type TaskWithRelations } from "@/lib/task-types";

type Filter = "active" | "done" | "cancelled";

const FILTER_LABELS: Record<Filter, string> = {
  active: "Активные",
  done: "Завершённые",
  cancelled: "Отменённые",
};

/**
 * «Отменённой» считаем задачу с неудачным исходом: отказ, отмена, не пришли.
 * Отдельного статуса «отменена» нет специально — важно не то, что задача
 * закрыта, а чем именно она закончилась.
 */
function filterOf(task: TaskWithRelations): Filter {
  if (task.status === "open") return "active";
  if (task.outcome && OUTCOME_TONE[task.outcome] === "bad") return "cancelled";
  return "done";
}

export function TaskFilterTabs({ tasks }: { tasks: TaskWithRelations[] }) {
  const [filter, setFilter] = useState<Filter>("active");

  const counts: Record<Filter, number> = {
    active: 0,
    done: 0,
    cancelled: 0,
  };

  for (const task of tasks) {
    counts[filterOf(task)] += 1;
  }

  const visible = tasks.filter((task) => filterOf(task) === filter);

  return (
    <>
      <div className="mb-3 flex gap-1.5">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => {
          const isActive = filter === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-brand bg-gradient-to-r from-brand to-brand-dark text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {FILTER_LABELS[key]}
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {filter === "active"
            ? "Активных задач нет — всё закрыто."
            : filter === "done"
              ? "Завершённых задач пока нет."
              : "Отменённых задач нет."}
        </div>
      ) : (
        // Высота примерно под четыре задачи, дальше прокрутка: длинный список
        // не должен выдавливать историю работы за пределы экрана.
        <ul className="max-h-[19rem] overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {visible.map((task) => (
            <TaskItem key={task.id} task={task} showDate />
          ))}
        </ul>
      )}
    </>
  );
}
