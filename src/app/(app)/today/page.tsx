import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { AddTaskForm } from "@/components/add-task-form";
import { DayNav } from "@/components/day-nav";
import { getDayTasks, getTasksForDate } from "@/lib/tasks";
import { todayISO } from "@/lib/dates";

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

  const today = todayISO();
  const date = isValidDate(params.date) ? params.date : today;
  const isToday = date === today;
  const isPast = date < today;

  const clients = await getClientOptions();

  // Сегодня — рабочий экран: просрочка, сегодня, завтра.
  // Другой день — просто его план, вместе с уже закрытыми задачами,
  // чтобы можно было заглянуть назад и увидеть, чем всё кончилось.
  const [dayTasks, dateTasks] = await Promise.all([
    isToday ? getDayTasks(profile.id, date) : Promise.resolve(null),
    isToday ? Promise.resolve(null) : getTasksForDate(date, profile.id),
  ]);

  const openCount = isToday
    ? (dayTasks?.overdue.length ?? 0) + (dayTasks?.today.length ?? 0)
    : (dateTasks ?? []).filter((t) => t.status === "open").length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Задачи"
        subtitle={
          isToday
            ? openCount === 0
              ? `Здравствуйте, ${profile.full_name}. На сегодня всё чисто.`
              : `Здравствуйте, ${profile.full_name}. К выполнению: ${openCount}.`
            : isPast
              ? "Прошедший день"
              : "Запланировано"
        }
        action={<AddTaskForm clients={clients} defaultDueDate={date} />}
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
  );
}
