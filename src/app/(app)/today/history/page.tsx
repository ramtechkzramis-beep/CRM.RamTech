import { requireProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { TaskGroup } from "@/components/task-item";
import { Pagination } from "@/components/pagination";
import { BackLink } from "@/components/back-link";
import { getCompletedTasks } from "@/lib/tasks";
import { getViewAsEmployeeId } from "@/lib/view-as";
import { getEmployeeById } from "@/lib/admin";

const PAGE_SIZE = 20;

/**
 * История завершённых задач сотрудника: что уже сделано, с каким итогом.
 * Свою историю видит каждый; в режиме просмотра за сотрудника показываем
 * его — так же, как это работает на экране задач.
 */
export default async function TaskHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const viewAsId = profile.can_view_as ? await getViewAsEmployeeId() : null;
  const viewedEmployee = viewAsId ? await getEmployeeById(viewAsId) : null;
  const targetId = viewedEmployee?.id ?? profile.id;

  const { tasks, total } = await getCompletedTasks(targetId, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-3xl">
      <BackLink href="/today" label="К задачам" />

      <PageHeader
        title="История задач"
        subtitle={
          total === 0
            ? "Завершённых задач пока нет"
            : `${viewedEmployee ? `${viewedEmployee.full_name} — з` : "З"}авершено задач: ${total}`
        }
      />

      <TaskGroup
        title={totalPages > 1 ? `Страница ${page} из ${totalPages}` : "Завершённые задачи"}
        tasks={tasks}
        showDate
        emptyMessage="Завершённых задач пока нет."
        currentUserId={profile.id}
        canManageAll={canManageUsers(profile.role)}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/today/history"
        searchParams={{}}
      />
    </div>
  );
}
