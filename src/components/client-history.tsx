import { History } from "lucide-react";
import {
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
} from "@/lib/task-types";
import type { TaskWithRelations } from "@/lib/task-types";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatWhen(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;

  return isThisYear ? `${day}, ${time}` : `${day} ${date.getFullYear()}, ${time}`;
}

/**
 * Летопись работы с компанией: только закрытые задачи, по времени
 * закрытия. Нужна перед звонком — видно, о чём говорили в прошлый раз
 * и чем закончилось, даже если работал другой сотрудник.
 */
export function ClientHistory({ history }: { history: TaskWithRelations[] }) {
  const items = history
    .filter((task) => task.completed_at)
    .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <History className="size-4 text-slate-400" />
        История работы
        {items.length > 0 && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {items.length}
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          С этой компанией ещё не работали. История появится, когда закроете
          первую задачу.
        </div>
      ) : (
        // Та же высота, что у списка задач выше: примерно четыре записи,
        // дальше прокрутка.
        <ul className="max-h-[19rem] space-y-2 overflow-y-auto pr-1">
          {items.map((task) => {
            const isCancelled = !!task.outcome && OUTCOME_TONE[task.outcome] === "bad";

            return (
              <li
                key={task.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-500">
                    {formatWhen(task.completed_at!)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600">
                    {task.assignee?.full_name ?? "—"}
                  </span>
                </div>

                <p
                  className={`mt-1 text-sm ${
                    isCancelled ? "text-slate-400 line-through" : "text-slate-500"
                  }`}
                >
                  {task.title}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 opacity-70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_TYPE_STYLES[task.type]}`}
                  >
                    {TASK_TYPE_LABELS[task.type]}
                  </span>
                  {task.outcome && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${OUTCOME_STYLES[OUTCOME_TONE[task.outcome]]}`}
                    >
                      {OUTCOME_LABELS[task.outcome]}
                    </span>
                  )}
                </div>

                {task.outcome_note && (
                  <p className="mt-1.5 rounded bg-white px-2 py-1.5 text-xs text-slate-600">
                    {task.outcome_note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
