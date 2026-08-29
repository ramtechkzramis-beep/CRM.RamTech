import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { getUpcomingTasks } from "@/lib/tasks";

/**
 * Весь план на будущее — сюда ведёт чип «Назначено» в шапке. Не один
 * день (было раньше — «завтра»), а все открытые задачи позже сегодня,
 * чтобы список совпадал со счётчиком в чипе.
 */
export default async function UpcomingPage() {
  const profile = await requireProfile();
  const tasks = await getUpcomingTasks(profile.id);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Назначено" subtitle="Открытые задачи на будущие дни" />

      <TaskGroup
        title="Запланировано"
        tasks={tasks}
        showDate
        emptyMessage="На будущее ничего не запланировано."
      />
    </div>
  );
}
