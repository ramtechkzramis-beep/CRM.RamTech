import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canSeeDashboard } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { SummaryFilters } from "@/components/summary-filters";
import { getDoneActions, getEmployees, getPlannedTasks } from "@/lib/summary";
import {
  byEmployee,
  planStatsFor,
  totalsFor,
  type PlanStats,
  type SummaryTotals,
} from "@/lib/summary-types";
import { periodRange, type PeriodType } from "@/lib/periods";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
} from "@/lib/task-types";
import { todayISO } from "@/lib/dates";

function isPeriod(value: string | undefined): value is PeriodType {
  return value === "day" || value === "week" || value === "month";
}

/**
 * Полоса выполнения плана одним градиентом: выполнено → сорвано → не закрыто.
 * Стыки размываем на BLEND процентов — резкие границы цвета режут глаз.
 */
function planGradient(done: number, cancelled: number, rate: number): string {
  const doneFrom = rate >= 80 ? "#34d399" : rate >= 50 ? "#fcd34d" : "#f87171";
  const doneTo = rate >= 80 ? "#059669" : rate >= 50 ? "#f59e0b" : "#dc2626";
  const cancelledColor = "#fca5a5";
  const pendingColor = "#cbd5e1";

  const BLEND = 2.5;
  const cancelledEnd = done + cancelled;

  // Плавный переход возможен, только если сегмент шире растушёвки,
  // иначе цвета схлопнутся в грязь.
  const stops: string[] = [`${doneFrom} 0%`];

  if (done > 0) {
    stops.push(`${doneTo} ${Math.max(done - BLEND, 0)}%`);
  }

  if (cancelled > 0) {
    stops.push(`${cancelledColor} ${Math.min(done + BLEND, 100)}%`);
    stops.push(`${cancelledColor} ${Math.max(cancelledEnd - BLEND, 0)}%`);
  }

  if (done + cancelled < 100) {
    stops.push(`${pendingColor} ${Math.min(cancelledEnd + BLEND, 100)}%`);
    stops.push(`${pendingColor} 100%`);
  }

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function PlanBlock({ stats }: { stats: PlanStats }) {
  if (stats.planned === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        На этот период задач не планировалось.
      </div>
    );
  }

  const rate = stats.rate ?? 0;
  // Порог условный, но без цвета цифра ни о чём не говорит.
  const rateColor =
    rate >= 80 ? "text-emerald-700" : rate >= 50 ? "text-amber-700" : "text-red-700";
  const donePercent = (stats.completed / stats.planned) * 100;
  const cancelledPercent = (stats.cancelled / stats.planned) * 100;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Коэффициент выполнения
          </p>
          <p className={`mt-1 text-3xl font-semibold ${rateColor}`}>{rate}%</p>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Запланировано</dt>
            <dd className="font-semibold text-slate-900">{stats.planned}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Выполнено</dt>
            <dd className="font-semibold text-emerald-700">{stats.completed}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Сорвано</dt>
            <dd className="font-semibold text-red-700">{stats.cancelled}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Не закрыто</dt>
            <dd className="font-semibold text-slate-600">{stats.pending}</dd>
          </div>
        </dl>
      </div>

      {/* Полоса из трёх частей: сразу видно, что съело план — срывы или незакрытое.
          Один градиент с растушёванными стыками: три отдельных блока давали
          резкие обрывы цвета. */}
      <div
        className="h-2.5 rounded-full"
        style={{ background: planGradient(donePercent, cancelledPercent, rate) }}
      />

      <p className="mt-2 text-xs text-slate-400">
        Коэффициент — доля выполненных от запланированных. Сорванные и незакрытые
        задачи его снижают.
      </p>
    </div>
  );
}

function TotalsRow({ totals }: { totals: SummaryTotals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {TASK_TYPES.map((type) => (
        <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TASK_TYPE_STYLES[type]}`}
          >
            {TASK_TYPE_LABELS[type]}
          </span>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals[type]}</p>
        </div>
      ))}
      <div className="rounded-xl border border-brand bg-gradient-to-r from-brand to-brand-dark p-4">
        <span className="text-xs font-medium text-slate-300">Всего действий</span>
        <p className="mt-2 text-2xl font-semibold text-white">{totals.total}</p>
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string; assignee?: string }>;
}) {
  const profile = await requireProfile();

  if (!canSeeDashboard(profile.role)) {
    notFound();
  }

  const params = await searchParams;
  const period = isPeriod(params.period) ? params.period : "day";
  const anchor = params.date ?? todayISO();
  const assigneeId = params.assignee ?? "";

  const range = periodRange(period, anchor);

  const [employees, actions, plannedTasks] = await Promise.all([
    getEmployees(),
    getDoneActions({
      from: range.from,
      to: range.to,
      assigneeId: assigneeId || undefined,
    }),
    getPlannedTasks({
      from: range.from,
      to: range.to,
      assigneeId: assigneeId || undefined,
    }),
  ]);

  const totals = totalsFor(actions);
  const perEmployee = byEmployee(actions);
  const planStats = planStatsFor(plannedTasks);
  const selected = employees.find((e) => e.id === assigneeId);

  // За день время говорит само за себя, за неделю и месяц нужна ещё и дата.
  const showDay = period !== "day";

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Сводка"
        subtitle={
          selected
            ? `Действия сотрудника: ${selected.full_name}`
            : "Действия всех сотрудников"
        }
      />

      <SummaryFilters
        period={period}
        anchor={anchor}
        assigneeId={assigneeId}
        employees={employees}
        label={range.label}
      />

      <PlanBlock stats={planStats} />

      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          За этот период выполненных действий нет.
        </div>
      ) : (
        <>
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {actions.map((action) => (
                <li key={action.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 pt-0.5 text-xs text-slate-400">
                    {formatTime(action.completed_at)}
                  </span>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TASK_TYPE_STYLES[action.type]}`}
                  >
                    {TASK_TYPE_LABELS[action.type]}
                  </span>

                  {action.outcome && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[action.outcome]]}`}
                    >
                      {OUTCOME_LABELS[action.outcome]}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900">{action.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      {action.client_id && action.client_name && (
                        <Link
                          href={`/clients/${action.client_id}`}
                          className="font-medium text-slate-600 hover:underline"
                        >
                          {action.client_name}
                        </Link>
                      )}
                      {showDay && <span>{formatDay(action.completed_at)}</span>}
                      {!assigneeId && action.assignee_name && (
                        <span>{action.assignee_name}</span>
                      )}
                    </div>
                    {action.outcome_note && (
                      <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                        {action.outcome_note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Разбивка по людям нужна, только когда смотрим всех сразу:
              при выбранном сотруднике она дублировала бы итоги. */}
          {!assigneeId && perEmployee.length > 1 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                По сотрудникам
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Сотрудник</th>
                      {TASK_TYPES.map((type) => (
                        <th key={type} className="px-4 py-2.5 text-center font-medium">
                          {TASK_TYPE_LABELS[type]}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-center font-medium">Всего</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perEmployee.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {row.name}
                        </td>
                        {TASK_TYPES.map((type) => (
                          <td key={type} className="px-4 py-2.5 text-center text-slate-600">
                            {row.totals[type] || "—"}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-center font-semibold text-slate-900">
                          {row.totals.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Итого за {period === "day" ? "день" : period === "week" ? "неделю" : "месяц"}
          </h2>
          <TotalsRow totals={totals} />
        </>
      )}
    </div>
  );
}
