import Link from "next/link";
import { TASK_TYPE_LABELS, type TaskWithRelations } from "@/lib/task-types";
import { formatDayLabelRu, formatTimeRu, todayISO } from "@/lib/dates";

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

/**
 * Следующий шаг по клиенту — ближайшая открытая задача, тёмной плашкой.
 *
 * Самое важное в карточке: менеджер открывает её перед звонком и должен
 * сразу видеть, о чём договорились и когда следующий контакт, не листая
 * ленту активности.
 */
export function ClientNextStep({ task }: { task: TaskWithRelations }) {
  const today = todayISO();
  const date = new Date(`${task.due_date}T00:00:00`);
  const time = formatTimeRu(task.due_time);
  const day = formatDayLabelRu(task.due_date, today).toLowerCase();

  const contact = task.contact?.full_name;
  const place = task.location ?? task.client?.address ?? null;

  const headline = [
    TASK_TYPE_LABELS[task.type],
    day,
    time ? `в ${time}` : null,
    contact ? `с ${contact}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const details = [task.description?.split(/\r?\n/)[0], place].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900 p-4 text-white">
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10">
        <span className="text-[10px] uppercase tracking-wider text-slate-300">
          {MONTHS_SHORT[date.getMonth()]}
        </span>
        <span className="text-xl font-bold leading-none">{date.getDate()}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">Следующий шаг</p>
        <p className="mt-0.5 text-[17px] font-semibold">{headline}</p>
        {details && <p className="mt-0.5 truncate text-sm text-slate-300">{details}</p>}
      </div>

      {/* Ведём на день задачи в общем экране: там её можно закрыть,
          перенести и посмотреть контакты. */}
      <Link
        href={task.due_date === today ? "/today" : `/today?date=${task.due_date}`}
        className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
      >
        Открыть задачу
      </Link>
    </div>
  );
}
