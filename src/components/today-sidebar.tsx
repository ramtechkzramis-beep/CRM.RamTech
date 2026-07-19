import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getDayTasks } from "@/lib/tasks";
import { TaskFilterTabs } from "@/components/task-filter-tabs";
import { ClientHistory } from "@/components/client-history";

/**
 * Правая колонка карточки клиента: задачи сотрудника на сегодня и история
 * работы с этой компанией.
 *
 * Задачи — чтобы, планируя новое действие, видеть, чем уже занят день.
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
  const tasks = await getDayTasks(profileId, undefined, { includeDone: true });

  // Просрочку показываем вместе с сегодняшними: панель — про то, что сейчас
  // на руках, а висящий со вчера прозвон никуда не делся.
  const all = [...tasks.overdue, ...tasks.today];
  const doneToday = tasks.today.filter((t) => t.status === "done").length;

  return (
    <aside className="w-[26rem] shrink-0 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="size-4 text-slate-400" />
            Мои задачи на сегодня
            {tasks.today.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {doneToday} из {tasks.today.length}
              </span>
            )}
          </h2>
          <Link
            href="/today"
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            все задачи
          </Link>
        </div>

        <TaskFilterTabs tasks={all} />
      </div>

      {clientId && <ClientHistory clientId={clientId} />}
    </aside>
  );
}
