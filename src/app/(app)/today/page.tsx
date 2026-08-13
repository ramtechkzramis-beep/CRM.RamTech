import { Eye } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { AddTaskForm } from "@/components/add-task-form";
import { DayNav } from "@/components/day-nav";
import { getDayTasks, getTasksForDate } from "@/lib/tasks";
import { todayISO } from "@/lib/dates";
import { getViewAsEmployeeId } from "@/lib/view-as";
import { getEmployeeById } from "@/lib/admin";
import { getEmployees } from "@/lib/summary";
import { getMyNotes } from "@/lib/notes";
import { clearViewAsEmployee } from "@/app/(app)/today/actions";
import { ROLE_LABELS } from "@/lib/types";
import { NotesPanel } from "@/components/notes-panel";

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

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;

  // «Смотреть как» — личное разрешение, не роль: даже если кто-то другой
  // подставит cookie вручную, viewedEmployee подтянется, только если у
  // ЕГО собственного профиля стоит can_view_as.
  const viewAsId = profile.can_view_as ? await getViewAsEmployeeId() : null;
  const viewedEmployee = viewAsId ? await getEmployeeById(viewAsId) : null;
  const targetId = viewedEmployee?.id ?? profile.id;

  const today = todayISO();
  const date = isValidDate(params.date) ? params.date : today;
  const isToday = date === today;
  const isPast = date < today;

  // Селектор «Исполнитель» в форме нужен только пока смотрим за кого-то
  // другого — иначе задача без явного выбора уйдёт вам, а не тому,
  // чей день вы сейчас ведёте.
  const [clients, assignees, notes] = await Promise.all([
    getClientOptions(),
    viewedEmployee ? getEmployees() : Promise.resolve([]),
    getMyNotes(profile.id),
  ]);

  // Сегодня — рабочий экран: просрочка, сегодня, завтра.
  // Другой день — просто его план, вместе с уже закрытыми задачами,
  // чтобы можно было заглянуть назад и увидеть, чем всё кончилось.
  const [dayTasks, dateTasks] = await Promise.all([
    isToday ? getDayTasks(targetId, date) : Promise.resolve(null),
    isToday ? Promise.resolve(null) : getTasksForDate(date, targetId),
  ]);

  const openCount = isToday
    ? (dayTasks?.overdue.length ?? 0) + (dayTasks?.today.length ?? 0)
    : (dateTasks ?? []).filter((t) => t.status === "open").length;

  return (
    <div className="flex items-start gap-5">
      <div className="min-w-0 max-w-3xl flex-1">
        {viewedEmployee && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-violet-900">
              <Eye className="size-4" />
              Режим просмотра: <strong>{viewedEmployee.full_name}</strong> ·{" "}
              {ROLE_LABELS[viewedEmployee.role]} — задачи и действия здесь закрепляются
              за {viewedEmployee.full_name}, а не за вами
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
          subtitle={
            viewedEmployee
              ? `Экран ${viewedEmployee.full_name} — ${openCount === 0 ? "на сегодня всё чисто" : `к выполнению: ${openCount}`}.`
              : isToday
                ? openCount === 0
                  ? `Здравствуйте, ${profile.full_name}. На сегодня всё чисто.`
                  : `Здравствуйте, ${profile.full_name}. К выполнению: ${openCount}.`
                : isPast
                  ? "Прошедший день"
                  : "Запланировано"
          }
          action={
            <AddTaskForm
              clients={clients}
              defaultDueDate={date}
              assignees={assignees}
              defaultAssigneeId={viewedEmployee?.id}
            />
          }
        />

        <div className="mb-5">
          <DayNav date={date} today={today} />
        </div>

        {isToday && dayTasks ? (
          <>
            <TaskGroup title="Просрочено" tasks={dayTasks.overdue} tone="danger" showDate />
            <TaskGroup
              title="Сегодня"
              tasks={dayTasks.today}
              emptyMessage="На сегодня задач нет."
            />
            <TaskGroup title="Завтра" tasks={dayTasks.tomorrow} />
          </>
        ) : (
          <TaskGroup
            title={isPast ? "Задачи этого дня" : "План на день"}
            tasks={dateTasks ?? []}
            emptyMessage={
              isPast ? "В этот день задач не было." : "На этот день задач не запланировано."
            }
          />
        )}
      </div>

      <NotesPanel initialContent={notes} />
    </div>
  );
}
