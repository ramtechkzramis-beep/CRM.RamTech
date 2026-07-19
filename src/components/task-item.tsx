import Link from "next/link";
import { Undo2 } from "lucide-react";
import { reopenTask } from "@/app/(app)/today/actions";
import { CloseTaskForm } from "@/components/close-task-form";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  type TaskWithRelations,
} from "@/lib/task-types";
import { formatDateRu, formatTimeRu } from "@/lib/dates";
import { segmentFor } from "@/lib/segments";
import { SEGMENT_LABELS, SEGMENT_STYLES } from "@/lib/segments";
import { LOYALTY_DOTS, type LoyaltyLevel } from "@/lib/client-types";

export function TaskItem({
  task,
  showAssignee = false,
  showDate = false,
}: {
  task: TaskWithRelations;
  showAssignee?: boolean;
  showDate?: boolean;
}) {
  const isDone = task.status === "done";

  // Зачёркиваем только то, что не состоялось (отказ, отмена, не пришли).
  // Успешно закрытая задача просто приглушается: она сделана, а не отменена.
  const isCancelled = isDone && !!task.outcome && OUTCOME_TONE[task.outcome] === "bad";

  const clientSegment =
    task.client?.status === "active"
      ? segmentFor(task.client.cycle_start_date, new Date(), task.client.contract_months)
      : null;

  return (
    <li
      className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0 ${
        isDone ? "bg-slate-50/70" : ""
      }`}
    >
      <div className="pt-0.5">
        {isDone ? (
          <form action={reopenTask}>
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="client_id" value={task.client_id ?? ""} />
            <button
              type="submit"
              aria-label="Вернуть в работу"
              title="Вернуть в работу"
              className="flex size-5 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <Undo2 className="size-3" />
            </button>
          </form>
        ) : (
          <CloseTaskForm task={task} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            isCancelled
              ? "text-slate-400 line-through"
              : isDone
                ? "text-slate-500"
                : "font-medium text-slate-900"
          }`}
        >
          {/* Время впереди заголовка: так список дня читается как расписание. */}
          {task.due_time && !isDone && (
            <span className="mr-2 font-semibold text-slate-900">
              {formatTimeRu(task.due_time)}
            </span>
          )}
          {task.title}
        </p>

        {task.description && !isDone && (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
            {task.description}
          </p>
        )}

        {/* Закрытые задачи не должны перетягивать внимание с активных —
            приглушаем их целиком, вместе со значками. */}
        <div
          className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 ${
            isDone ? "opacity-70" : ""
          }`}
        >
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${TASK_TYPE_STYLES[task.type]}`}
          >
            {TASK_TYPE_LABELS[task.type]}
          </span>

          {/* Итог задачи — то, ради чего всё затевалось: видно, чем кончилось,
              без захода внутрь. */}
          {task.outcome && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${OUTCOME_STYLES[OUTCOME_TONE[task.outcome]]}`}
            >
              {OUTCOME_LABELS[task.outcome]}
            </span>
          )}

          {task.client && (
            <span className="inline-flex items-center gap-1.5">
              {/* Цвет лояльности рядом с именем: видно, с кем говоришь,
                  ещё до захода в карточку. */}
              {task.client.loyalty && (
                <span
                  className={`size-2 rounded-full ${LOYALTY_DOTS[task.client.loyalty as LoyaltyLevel]}`}
                />
              )}
              <Link
                href={`/clients/${task.client.id}`}
                className="font-medium text-slate-600 hover:underline"
              >
                {task.client.name}
              </Link>
              {/* ППС показываем только у текущих клиентов: у холодной базы
                  сегмента нет, и пустой значок только путал бы. */}
              {clientSegment && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SEGMENT_STYLES[clientSegment]}`}
                >
                  {SEGMENT_LABELS[clientSegment]}
                </span>
              )}
            </span>
          )}
          {showDate && <span>до {formatDateRu(task.due_date)}</span>}
          {showAssignee && task.assignee && <span>{task.assignee.full_name}</span>}
          {task.priority !== "normal" && !isDone && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLES[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
        </div>

        {task.outcome_note && (
          <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            {task.outcome_note}
          </p>
        )}
      </div>
    </li>
  );
}

export function TaskGroup({
  title,
  tasks,
  tone = "default",
  showAssignee = false,
  showDate = false,
  emptyMessage,
}: {
  title: string;
  tasks: TaskWithRelations[];
  tone?: "default" | "danger";
  showAssignee?: boolean;
  showDate?: boolean;
  emptyMessage?: string;
}) {
  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <section className="mb-6">
      <h2
        className={`mb-2 flex items-center gap-2 text-sm font-semibold ${
          tone === "danger" ? "text-red-700" : "text-slate-900"
        }`}
      >
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {tasks.length}
        </span>
      </h2>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <ul
          className={`overflow-hidden rounded-xl border bg-white ${
            tone === "danger" ? "border-red-200" : "border-slate-200"
          }`}
        >
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              showAssignee={showAssignee}
              showDate={showDate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
