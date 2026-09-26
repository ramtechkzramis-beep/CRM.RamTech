import { canManageUsers } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { BackLink } from "@/components/back-link";
import { getFollowUpTasks } from "@/lib/tasks";
import { getTaskScreenTarget } from "@/lib/view-as";

/**
 * Отложенные дела: обещали перезвонить, перенесли встречу, дали отсрочку.
 * Формально задачи закрыты, но клиент ждёт — сюда ведёт чип «Отложено»
 * в шапке. Список свой для каждого сотрудника, как и сам счётчик, а в
 * режиме просмотра — того, чей экран открыт.
 */
export default async function FollowUpPage() {
  const { profile, employee, targetId } = await getTaskScreenTarget();
  const tasks = await getFollowUpTasks(targetId);

  return (
    <div className="max-w-3xl">
      <BackLink href="/today" label="К задачам" />

      <PageHeader
        title="Отложено"
        subtitle={
          employee
            ? `${employee.full_name} — компании, к которым нужно вернуться`
            : "Обещали перезвонить, перенесли встречу или дали отсрочку — компании, к которым нужно вернуться"
        }
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
