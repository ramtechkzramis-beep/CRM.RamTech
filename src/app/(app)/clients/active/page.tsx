import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { SegmentTabs } from "@/components/segment-tabs";
import { LoyaltyFilter } from "@/components/loyalty-filter";
import { ClientFilters } from "@/components/client-filters";
import { getActiveClients } from "@/lib/clients";
import { getEmployees } from "@/lib/summary";
import { SEGMENTS, type Segment } from "@/lib/segments";
import {
  LOYALTY_LEVELS,
  isClientSort,
  type LoyaltyLevel,
} from "@/lib/client-types";
import { isStage, STAGE_LABELS } from "@/lib/stages";

function isSegment(value: string | undefined): value is Segment {
  return !!value && (SEGMENTS as readonly string[]).includes(value);
}

function isLoyalty(value: string | undefined): value is LoyaltyLevel {
  return !!value && (LOYALTY_LEVELS as string[]).includes(value);
}

export default async function ActiveClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    segment?: string;
    loyalty?: string;
    stage?: string;
    q?: string;
    owner?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;

  const current = isSegment(params.segment) ? params.segment : null;
  const currentLoyalty = isLoyalty(params.loyalty) ? params.loyalty : null;
  const currentStage = isStage(params.stage) ? params.stage : null;
  const query = params.q?.trim() ?? "";
  const ownerId = params.owner ?? "";
  const sort = isClientSort(params.sort) ? params.sort : "renewal";

  // Поиск, куратор и сортировка — в запросе к базе. Сегмент, лояльность
  // и этап считаем здесь: счётчики вкладок должны показывать всю выборку,
  // а не только отфильтрованную по ним же.
  const [clients, employees] = await Promise.all([
    getActiveClients({ query, ownerId: ownerId || undefined, sort }),
    getEmployees(),
  ]);

  const counts = SEGMENTS.reduce(
    (acc, segment) => {
      acc[segment] = clients.filter((c) => c.segment === segment).length;
      return acc;
    },
    {} as Record<Segment, number>,
  );

  const loyaltyCounts = {
    green: clients.filter((c) => c.loyalty === "green").length,
    yellow: clients.filter((c) => c.loyalty === "yellow").length,
    red: clients.filter((c) => c.loyalty === "red").length,
    none: clients.filter((c) => !c.loyalty).length,
  };

  const visible = clients.filter((client) => {
    if (current && client.segment !== current) return false;
    if (currentLoyalty && client.loyalty !== currentLoyalty) return false;
    if (currentStage && client.stage !== currentStage) return false;
    return true;
  });

  const isSearching = !!query || !!ownerId;

  return (
    <>
      <PageHeader
        title="Текущие клиенты"
        subtitle={
          isSearching
            ? `Найдено: ${clients.length}`
            : `В работе: ${clients.length}. ППС начинается, когда проект одобрен.`
        }
        action={
          <Link
            href="/clients/archived"
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            Архив →
          </Link>
        }
      />

      <ClientFilters
        employees={employees}
        query={query}
        ownerId={ownerId}
        sort={sort}
      />

      <SegmentTabs counts={counts} total={clients.length} current={current} />
      <LoyaltyFilter counts={loyaltyCounts} current={currentLoyalty} segment={current} />

      {/* Фильтр по этапу приходит с воронки на дашборде — показываем его
          отдельной плашкой, иначе непонятно, почему список короткий. */}
      {currentStage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand bg-brand-soft px-3 py-2 text-sm">
          <span className="text-slate-600">Этап проекта:</span>
          <span className="font-medium text-slate-900">
            {STAGE_LABELS[currentStage]}
          </span>
          <Link
            href="/clients/active"
            className="ml-auto text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            сбросить
          </Link>
        </div>
      )}

      <ClientTable
        clients={visible}
        variant="active"
        emptyMessage={
          query
            ? `По запросу «${query}» ничего не нашлось.`
            : current || currentLoyalty || currentStage || ownerId
              ? "Под этот фильтр клиентов нет."
              : "Пока нет клиентов в работе. Переведите клиента из холодной базы."
        }
      />
    </>
  );
}
