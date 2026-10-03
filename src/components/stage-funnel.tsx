import Link from "next/link";
import { Loader } from "lucide-react";
import type { ClientWithSegment } from "@/lib/client-types";
import {
  STAGES,
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

  // Узкое место — этап, где стоит больше всего проектов. Показываем, только
  // когда там действительно скопление, а не один проект из одного.
  const bottleneck = STAGES.reduce<ProjectStage | null>((worst, stage) => {
    if (counts[stage] < 2) return worst;
    if (!worst || counts[stage] > counts[worst]) return stage;
    return worst;
  }, null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-slate-900">Воронка проектов</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Где клиенты после заключения договора
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1 text-sm text-slate-600">
          В работе: <strong className="font-semibold text-slate-900">{clients.length}</strong>
        </span>
      </div>

      <ol className="space-y-3.5">
        {STAGES.map((stage, index) => {
          const count = counts[stage];
          const width = (count / max) * 100;

          return (
            <li key={stage}>
              <Link href={`/clients/active?stage=${stage}`} className="group block">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="text-xs text-slate-400">{index + 1}</span>
                    <span className="text-sm font-semibold text-slate-900 group-hover:underline">
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="hidden truncate text-xs text-slate-400 sm:inline">
                      {STAGE_DESCRIPTIONS[stage]}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">{count}</span>
                </div>

                {/* Пустой этап показываем пустой дорожкой, а не пропускаем:
                    провал в середине воронки — сам по себе важный сигнал. */}
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: count === 0 ? "0%" : `${Math.max(width, 4)}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {bottleneck && (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-slate-700">
          <Loader className="size-4 shrink-0 text-brand" />
          Узкое место: {counts[bottleneck]} из {clients.length} проектов стоят на этапе «
          {STAGE_LABELS[bottleneck].toLowerCase()}»
        </p>
      )}

      {withoutStage > 0 && (
        // Клиент без этапа выпадает из процесса — это нужно видеть.
        <Link
          href="/clients/active"
          className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-sm transition hover:bg-slate-50"
        >
          <span className="text-slate-500">Без этапа</span>
          <span className="font-semibold text-slate-700">{withoutStage}</span>
        </Link>
      )}
    </div>
  );
}
