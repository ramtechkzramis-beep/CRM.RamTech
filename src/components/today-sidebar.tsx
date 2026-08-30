import { ListChecks } from "lucide-react";
import { getClientHistory, getClientTasks, getDayTasks } from "@/lib/tasks";
import { todayISO } from "@/lib/dates";
import { TaskFilterTabs } from "@/components/task-filter-tabs";
import { ClientHistory } from "@/components/client-history";
import { MyTasksPanel } from "@/components/my-tasks-panel";

/**
 * Правая колонка карточки клиента: задачи сотрудника на сегодня, задачи
 * по самой компании (любой исполнитель, любая дата) и история работы.
 *
 * Мои задачи — чтобы, планируя новое действие, видеть, чем уже занят день.
 * Задачи компании — что вообще запланировано по ней, а не только моё.
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
  const [tasks, clientTasks, history] = await Promise.all([
    getDayTasks(profileId, undefined, { includeDone: true }),
    clientId ? getClientTasks(clientId) : Promise.resolve([]),
    clientId ? getClientHistory(clientId) : Promise.resolve([]),
  ]);

  // Просрочку показываем вместе с сегодняшними: панель — про то, что сейчас
  // на руках, а висящий со вчера прозвон никуда не делся.
  const all = [...tasks.overdue, ...tasks.today];

  return (
    <aside className="w-[26rem] shrink-0 space-y-4">
      <MyTasksPanel today={todayISO()} initialTasks={all} />

      {clientId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ListChecks className="size-4 text-slate-400" />
            Задачи по компании
            {clientTasks.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {clientTasks.length}
              </span>
            )}
          </h2>

          <TaskFilterTabs tasks={clientTasks} showAssignee />
        </div>
      )}

      {clientId && <ClientHistory history={history} />}
    </aside>
  );
}
