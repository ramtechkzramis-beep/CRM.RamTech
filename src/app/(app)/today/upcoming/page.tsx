import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { getUpcomingTasks } from "@/lib/tasks";
import { formatDateHeadingRu } from "@/lib/dates";

/**
 * Весь план на будущее — сюда ведёт чип «Назначено» в шапке. Не один
 * день (было раньше — «завтра»), а все открытые задачи позже сегодня,
 * чтобы список совпадал со счётчиком в чипе.
 *
 * Группируем по дате отдельными блоками — плоский список из задач на
 * разные дни было легко перепутать, особенно когда их много.
 */
export default async function UpcomingPage() {
  const profile = await requireProfile();
  const tasks = await getUpcomingTasks(profile.id);

  // getUpcomingTasks уже отдаёт задачи по возрастанию due_date — порядок
  // групп сохраняется сам собой через порядок первого появления даты.
  const byDate = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const group = byDate.get(task.due_date);
    if (group) group.push(task);
    else byDate.set(task.due_date, [task]);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Назначено" subtitle="Открытые задачи на будущие дни" />

      {tasks.length === 0 ? (
        <TaskGroup
          title="Запланировано"
          tasks={[]}
          emptyMessage="На будущее ничего не запланировано."
        />
      ) : (
        [...byDate.entries()].map(([date, dayTasks]) => (
          <TaskGroup key={date} title={formatDateHeadingRu(date)} tasks={dayTasks} />
        ))
      )}
    </div>
  );
}
