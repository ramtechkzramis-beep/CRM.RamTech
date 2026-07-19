import Link from "next/link";
import {
  LOYALTY_CHANCE,
  LOYALTY_DESCRIPTIONS,
  LOYALTY_DOTS,
  LOYALTY_LABELS,
  LOYALTY_LEVELS,
  type LoyaltyLevel,
} from "@/lib/client-types";
import type { Segment } from "@/lib/segments";

/**
 * Фильтр по лояльности. Ссылками, а не кнопками: фильтр остаётся в адресе,
 * поэтому «покажи мне всех красных» можно переслать сотруднику ссылкой.
 */
export function LoyaltyFilter({
  counts,
  current,
  segment,
}: {
  counts: Record<LoyaltyLevel | "none", number>;
  current: LoyaltyLevel | null;
  segment: Segment | null;
}) {
  const href = (loyalty: LoyaltyLevel | null) => {
    const params = new URLSearchParams();
    if (segment) params.set("segment", segment);
    if (loyalty) params.set("loyalty", loyalty);
    const query = params.toString();
    return query ? `/clients/active?${query}` : "/clients/active";
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-400">Лояльность</span>

      <Link
        href={href(null)}
        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
          !current
            ? "border-brand bg-gradient-to-r from-brand to-brand-dark text-white"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        }`}
      >
        Любая
      </Link>

      {LOYALTY_LEVELS.map((level) => {
        const isActive = current === level;

        return (
          <Link
            key={level}
            href={href(level)}
            title={`${LOYALTY_DESCRIPTIONS[level]}. Вероятность продления ${LOYALTY_CHANCE[level]}`}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
              isActive
                ? "border-brand bg-gradient-to-r from-brand to-brand-dark text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span className={`size-2 rounded-full ${LOYALTY_DOTS[level]}`} />
            {LOYALTY_LABELS[level]}
            <span
              className={`rounded-full px-1.5 text-xs ${
                isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"
              }`}
            >
              {counts[level]}
            </span>
          </Link>
        );
      })}

      {counts.none > 0 && (
        // Неоценённые не прячем: пока клиента не оценили, риск не виден.
        <span
          title="У этих клиентов лояльность ещё не оценена"
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500"
        >
          Без оценки: {counts.none}
        </span>
      )}
    </div>
  );
}
