import { requireProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { getFollowUpTasks } from "@/lib/tasks";

/**
 * Отложенные дела: обещали перезвонить, перенесли встречу, дали отсрочку.
 * Формально задачи закрыты, но клиент ждёт — сюда ведёт чип «Отложено»
 * в шапке. Список свой для каждого сотрудника, как и сам счётчик.
 */
export default async function FollowUpPage() {
  const profile = await requireProfile();
  const tasks = await getFollowUpTasks(profile.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Отложено"
        subtitle="Обещали перезвонить, перенесли встречу или дали отсрочку — компании, к которым нужно вернуться"
      />

      <TaskGroup
        title="За последние 30 дней"
        tasks={tasks}
        showDate
        emptyMessage="Отложенных дел нет."
        currentUserId={profile.id}
        canManageAll={canManageUsers(profile.role)}
      />
    </div>
  );
}
