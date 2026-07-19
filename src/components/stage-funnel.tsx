import Link from "next/link";
import type { ClientWithSegment } from "@/lib/client-types";
import {
  STAGES,
  STAGE_BARS,
  STAGE_DESCRIPTIONS,
  STAGE_LABELS,
  type ProjectStage,
} from "@/lib/stages";

/**
 * Воронка проектов: где сейчас клиенты после заключения договора.
 *
 * Намеренно не доска с карточками: важно видеть, сколько проектов застряло
 * на этапе, а не таскать их мышкой. Полосы читаются с одного взгляда —
 * длина показывает объём, а не абстрактная колонка.
 */
export function StageFunnel({ clients }: { clients: ClientWithSegment[] }) {
  const counts = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = clients.filter((c) => c.stage === stage).length;
      return acc;
    },
    {} as Record<ProjectStage, number>,
  );

  const withoutStage = clients.filter((c) => !c.stage).length;
  // Масштабируем по самому многочисленному этапу, а не по общему числу:
  // иначе при 20 клиентах в одном этапе остальные полосы схлопнутся в нить.
  const max = Math.max(...STAGES.map((s) => counts[s]), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Воронка проектов</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Где сейчас клиенты после заключения договора
          </p>
        </div>
        <span className="text-sm text-slate-500">
          Всего в работе: {clients.length}
        </span>
      </div>

      <ol className="space-y-3">
        {STAGES.map((stage, index) => {
          const count = counts[stage];
          const width = (count / max) * 100;

          return (
            <li key={stage}>
              <Link
                href={`/clients/active?stage=${stage}`}
                className="group block rounded-lg p-2 transition hover:bg-slate-50"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 group-hover:underline">
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">
                      {STAGE_DESCRIPTIONS[stage]}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>

                {/* Пустой этап показываем тонкой линией, а не пропускаем:
                    провал в середине воронки — сам по себе важный сигнал. */}
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${STAGE_BARS[stage]} transition-all`}
                    style={{ width: count === 0 ? "0%" : `${Math.max(width, 4)}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {withoutStage > 0 && (
        // Клиент без этапа выпадает из процесса — это нужно видеть.
        <Link
          href="/clients/active"
          className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm transition hover:bg-slate-50"
        >
          <span className="text-slate-500">Без этапа</span>
          <span className="font-semibold text-slate-700">{withoutStage}</span>
        </Link>
      )}
    </div>
  );
}
