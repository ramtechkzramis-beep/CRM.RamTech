import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canSeeDashboard } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { SummaryFilters } from "@/components/summary-filters";
import { Pagination } from "@/components/pagination";
import { TotalsBreakdown } from "@/components/totals-breakdown";
import { WarmStats } from "@/components/warm-stats";
import { SummaryEmployees } from "@/components/summary-employees";
import { getDoneActions, getEmployees, getPlannedTasks, getWarmEvents } from "@/lib/summary";
import {
  employeeBreakdown,
  planStatsFor,
  totalsFor,
  type PlanStats,
} from "@/lib/summary-types";
import { periodRange, type PeriodType } from "@/lib/periods";
import {
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
} from "@/lib/task-types";
import { todayISO } from "@/lib/dates";

function isPeriod(value: string | undefined): value is PeriodType {
  return value === "day" || value === "week" || value === "month";
}

/** Лента действий может разрастись на неделе/месяце — режем на страницы,
 * чтобы не листать её целиком вниз. Итоги и разбивка по сотрудникам
 * считаются от полного списка за период, а не от одной страницы. */
const ACTIONS_PAGE_SIZE = 25;

const PERIOD_WORD: Record<PeriodType, string> = {
  day: "день",
  week: "неделю",
  month: "месяц",
};

/** Цвет точки слева в ленте — чем закончилось действие. */
const FEED_DOTS: Record<"good" | "neutral" | "bad", string> = {
  good: "bg-emerald-500",
  neutral: "bg-amber-400",
  bad: "bg-slate-300",
};

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

function PlanBlock({ stats, period }: { stats: PlanStats; period: PeriodType }) {
  if (stats.planned === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500">
        На этот {PERIOD_WORD[period] === "день" ? "день" : "период"} задач не планировалось —
        в ленте только фактические действия.
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">Коэффициент выполнения</p>
      <p className={`mt-1 text-[30px] font-bold leading-none ${rateColor}`}>{rate}%</p>

      {/* Полоса из трёх частей: сразу видно, что съело план — срывы или
          незакрытое. Один градиент с растушёванными стыками: три отдельных
          блока давали резкие обрывы цвета. */}
      <div
        className="mt-4 h-2.5 rounded-full"
        style={{ background: planGradient(donePercent, cancelledPercent, rate) }}
      />

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Запланировано</dt>
          <dd className="font-semibold text-slate-900">{stats.planned}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Выполнено</dt>
          <dd className="font-semibold text-emerald-700">{stats.completed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Сорвано</dt>
          <dd className="font-semibold text-red-700">{stats.cancelled}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Не закрыто</dt>
          <dd className="font-semibold text-slate-600">{stats.pending}</dd>
        </div>
      </dl>
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
  searchParams: Promise<{ period?: string; date?: string; assignee?: string; page?: string }>;
}) {
  const profile = await requireProfile();

  if (!canSeeDashboard(profile.role)) {
    notFound();
  }

  const params = await searchParams;
  const period = isPeriod(params.period) ? params.period : "day";
  const anchor = params.date ?? todayISO();
  const assigneeId = params.assignee ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const range = periodRange(period, anchor);

  const [employees, actions, plannedTasks, warmEvents] = await Promise.all([
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
    getWarmEvents({
      from: range.from,
      to: range.to,
      ownerId: assigneeId || undefined,
    }),
  ]);

  const totals = totalsFor(actions);
  const perEmployee = employeeBreakdown(actions);
  const planStats = planStatsFor(plannedTasks);
  const selected = employees.find((e) => e.id === assigneeId);

  const totalPages = Math.max(1, Math.ceil(actions.length / ACTIONS_PAGE_SIZE));
  const pagedActions = actions.slice(
    (page - 1) * ACTIONS_PAGE_SIZE,
    page * ACTIONS_PAGE_SIZE,
  );

  // За день время говорит само за себя, за неделю и месяц нужна ещё и дата.
  const showDay = period !== "day";

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow={
          selected ? `Действия сотрудника: ${selected.full_name}` : "Действия всех сотрудников"
        }
        title="Сводка"
        action={
          <SummaryFilters
            period={period}
            anchor={anchor}
            assigneeId={assigneeId}
            employees={employees}
            label={range.label}
          />
        }
      />

      {/* Наработки вне ветки «нет действий»: компанию могли оформить
          в день, когда ни одной задачи не закрывали. */}
      <h2 className="mb-2.5 text-[11px] uppercase tracking-wider text-slate-400">
        Наработки · решения за {PERIOD_WORD[period]}
      </h2>
      <WarmStats events={warmEvents} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <h2 className="mb-2.5 text-[11px] uppercase tracking-wider text-slate-400">
            Лента действий · {actions.length}
          </h2>

          {actions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              За этот период выполненных действий нет.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100">
                  {pagedActions.map((action) => (
                    <li key={action.id} className="flex items-start gap-3 px-4 py-3.5">
                      <span className="w-12 shrink-0 pt-0.5 text-xs text-slate-400">
                        {formatTime(action.completed_at)}
                      </span>

                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          action.outcome
                            ? FEED_DOTS[OUTCOME_TONE[action.outcome]]
                            : "bg-slate-300"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {TASK_TYPE_LABELS[action.type]}
                          </span>
                          {action.outcome && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[action.outcome]]}`}
                            >
                              {OUTCOME_LABELS[action.outcome]}
                            </span>
                          )}
                        </p>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                          {action.client_id && action.client_name && (
                            <Link
                              href={`/clients/${action.client_id}`}
                              className="font-medium text-slate-700 hover:underline"
                            >
                              {action.client_name}
                            </Link>
                          )}
                          {showDay && <span>· {formatDay(action.completed_at)}</span>}
                          {!assigneeId && action.assignee_name && (
                            <span>· {action.assignee_name}</span>
                          )}
                        </div>

                        {action.outcome_note && (
                          <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            {action.outcome_note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/summary"
                searchParams={{
                  ...(period !== "day" && { period }),
                  ...(params.date && { date: anchor }),
                  ...(assigneeId && { assignee: assigneeId }),
                }}
              />
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-wider text-slate-400">По сотрудникам</h2>

          {/* Разбивка по людям нужна, только когда смотрим всех сразу:
              при выбранном сотруднике она дублировала бы итоги. */}
          {!assigneeId && perEmployee.length > 0 ? (
            <SummaryEmployees rows={perEmployee} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500">
              {assigneeId
                ? "Выбран один сотрудник — его действия в ленте слева."
                : "За этот период действий не было."}
            </div>
          )}

          <PlanBlock stats={planStats} period={period} />
        </div>
      </div>

      {actions.length > 0 && (
        <>
          <h2 className="mb-2.5 mt-6 text-[11px] uppercase tracking-wider text-slate-400">
            Итого за {PERIOD_WORD[period]}
          </h2>
          <TotalsBreakdown totals={totals} actions={actions} />
        </>
      )}
    </div>
  );
}
