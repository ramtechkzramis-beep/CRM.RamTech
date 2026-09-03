import { getClientHistory, getDayTasks } from "@/lib/tasks";
import { todayISO } from "@/lib/dates";
import { ClientHistory } from "@/components/client-history";
import { MyTasksPanel } from "@/components/my-tasks-panel";

/**
 * Правая колонка карточки клиента: задачи сотрудника на сегодня и история
 * работы с этой компанией.
 *
 * Мои задачи — чтобы, планируя новое действие, видеть, чем уже занят день.
 * История — чтобы перед звонком знать, о чём говорили в прошлый раз.
 */
export async function TodaySidebar({
  profileId,
  clientId,
}: {
  profileId: string;
  clientId?: string;
}) {
  // Закрытые задачи тоже забираем: иначе счётчик в шапке («2 из 5»)
  // расходится со списком и сбивает с толку.
  const [tasks, history] = await Promise.all([
    getDayTasks(profileId, undefined, { includeDone: true }),
    clientId ? getClientHistory(clientId) : Promise.resolve([]),
  ]);

  // Просрочку показываем вместе с сегодняшними: панель — про то, что сейчас
  // на руках, а висящий со вчера прозвон никуда не делся.
  const all = [...tasks.overdue, ...tasks.today];

  return (
    <aside className="w-[26rem] shrink-0 space-y-4">
      <MyTasksPanel today={todayISO()} initialTasks={all} currentUserId={profileId} />

      {clientId && <ClientHistory history={history} />}
    </aside>
  );
}
