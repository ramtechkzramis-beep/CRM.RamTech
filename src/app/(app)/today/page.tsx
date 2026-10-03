import Link from "next/link";
import { Eye, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskBoard, type TaskGroupData } from "@/components/task-board";
import { AddTaskForm } from "@/components/add-task-form";
import { DayNav } from "@/components/day-nav";
import { getDayTasks, getTasksForDate } from "@/lib/tasks";
import {
  addDaysISO,
  formatDateHeadingRu,
  formatFullDateRu,
  formatTimeRu,
  todayISO,
} from "@/lib/dates";
import { getTaskScreenTarget } from "@/lib/view-as";
import { getEmployees } from "@/lib/summary";
import { clearViewAsEmployee } from "@/app/(app)/today/actions";
import { TASK_TYPE_LABELS, type TaskWithRelations } from "@/lib/task-types";
import { ROLE_LABELS, canManageUsers } from "@/lib/types";

async function getClientOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .neq("status", "archived")
    .order("name");

  return data ?? [];
}

function isValidDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Подсказка под «на сегодня всё чисто»: ближайшее назначенное дело.
 * Пустой день без неё выглядит так, будто работы нет вообще.
 */
function nextTaskHint(tasks: TaskWithRelations[], today: string): string | null {
  const next = tasks.find((task) => task.status === "open");
  if (!next) return null;

  const when = next.due_date === addDaysISO(today, 1) ? "завтра" : formatDateHeadingRu(next.due_date);
  const time = formatTimeRu(next.due_time);
  const what = TASK_TYPE_LABELS[next.type].toLowerCase();
  const who = next.client?.name ? `, ${next.client.name}` : "";

  return `Ближайшая ${what} — ${when}${time ? ` в ${time}` : ""}${who}`;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // Чей это экран — свой или сотрудника, за которого смотрим. Та же
  // функция стоит в меню и в списках, куда ведут его счётчики.
  const { profile, employee: viewedEmployee, targetId } = await getTaskScreenTarget();

  const today = todayISO();
  const date = isValidDate(params.date) ? params.date : today;
  const isToday = date === today;
  const isPast = date < today;

  // Селектор «Исполнитель» в форме нужен только пока смотрим за кого-то
  // другого — иначе задача без явного выбора уйдёт вам, а не тому,
  // чей день вы сейчас ведёте.
  const [clients, assignees] = await Promise.all([
    getClientOptions(),
    viewedEmployee ? getEmployees() : Promise.resolve([]),
  ]);

  // Сегодня — рабочий экран: просрочка, сегодня, завтра.
  // Другой день — просто его план, вместе с уже закрытыми задачами,
  // чтобы можно было заглянуть назад и увидеть, чем всё кончилось.
  //
  // includeDone: сегодняшний список показывает и уже завершённые дела —
  // иначе он расходился со счётчиком в меню и не было видно, что за день
  // уже сделано.
  const [dayTasks, dateTasks] = await Promise.all([
    isToday ? getDayTasks(targetId, date, { includeDone: true }) : Promise.resolve(null),
    isToday ? Promise.resolve(null) : getTasksForDate(date, targetId),
  ]);

  const groups: TaskGroupData[] = isToday
    ? [
        ...(dayTasks && dayTasks.overdue.length > 0
          ? [
              {
                key: "overdue",
                title: "Просрочено",
                tone: "danger" as const,
                tasks: dayTasks.overdue,
              },
            ]
          : []),
        {
          key: "today",
          title: "Сегодня",
          tasks: dayTasks?.today ?? [],
          emptyTitle: "На сегодня всё чисто",
          emptyHint: nextTaskHint(dayTasks?.tomorrow ?? [], today),
        },
        {
          key: "tomorrow",
          title: `Завтра, ${formatDateHeadingRu(addDaysISO(today, 1)).split(",")[0]}`,
          tasks: dayTasks?.tomorrow ?? [],
        },
      ]
    : [
        {
          key: date,
          title: formatDateHeadingRu(date),
          tasks: dateTasks ?? [],
          emptyTitle: isPast ? "В этот день задач не было" : "На этот день задач нет",
          emptyHint: null,
        },
      ];

  return (
    <div>
      {viewedEmployee && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-violet-900">
            <Eye className="size-4" />
            Режим просмотра: <strong>{viewedEmployee.full_name}</strong> ·{" "}
            {ROLE_LABELS[viewedEmployee.role]} — задачи и действия здесь закрепляются за{" "}
            {viewedEmployee.full_name}, а не за вами
          </p>
          <form action={clearViewAsEmployee}>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-violet-700 shadow-sm transition hover:bg-violet-100"
            >
              Вернуться к своему экрану
            </button>
          </form>
        </div>
      )}

      <PageHeader
        title="Задачи"
        eyebrow={formatFullDateRu(date)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DayNav date={date} today={today} />

            {/* Экран дня показывает только ближайшее — вся закрытая работа
                за прошлые месяцы живёт в истории. */}
            <Link
              href="/today/history"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <History className="size-4" />
              История
            </Link>

            <AddTaskForm
              clients={clients}
              defaultDueDate={date}
              assignees={assignees}
              defaultAssigneeId={viewedEmployee?.id}
            />
          </div>
        }
      />

      <TaskBoard
        groups={groups}
        today={today}
        currentUserId={profile.id}
        canManageAll={canManageUsers(profile.role)}
      />
    </div>
  );
}
