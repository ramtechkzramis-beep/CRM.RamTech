import { OUTCOME_LABELS, type TaskOutcome } from "@/lib/task-types";
import type { EmployeeBreakdown } from "@/lib/summary-types";

/** Цвет доли в полосе — тот же смысл, что у плашек исходов в ленте. */
const TONE_BARS: Record<"good" | "neutral" | "bad", string> = {
  good: "bg-emerald-500",
  neutral: "bg-amber-400",
  bad: "bg-red-400",
};

function outcomeText(outcomes: { outcome: TaskOutcome; count: number }[]): string {
  return outcomes
    .map(({ outcome, count }) => `${OUTCOME_LABELS[outcome]} ${count}`)
    .join(" · ");
}

/**
 * «По сотрудникам» за период: сколько действий и чем они кончились.
 *
 * Полоса показывает соотношение исходов — по одной цифре «4 действия»
 * нельзя понять, это четыре проведённые встречи или четыре отказа.
 */
export function SummaryEmployees({ rows }: { rows: EmployeeBreakdown[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      {rows.map((row) => {
        const segments = (["good", "neutral", "bad"] as const).filter(
          (tone) => row[tone] > 0,
        );

        return (
          <div key={row.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-dark">
                {row.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {row.name}
              </span>
              <span className="shrink-0 text-lg font-semibold text-slate-900">{row.total}</span>
            </div>

            <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-slate-100">
              {segments.map((tone) => (
                <span
                  key={tone}
                  className={`${TONE_BARS[tone]} rounded-full`}
                  style={{ width: `${(row[tone] / row.total) * 100}%` }}
                />
              ))}
            </div>

            {row.outcomes.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">{outcomeText(row.outcomes)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
