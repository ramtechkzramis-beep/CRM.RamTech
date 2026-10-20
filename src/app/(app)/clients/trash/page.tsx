import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { ColdFilters } from "@/components/cold-filters";
import { Pagination } from "@/components/pagination";
import {
  COLD_PAGE_SIZE,
  canCleanBase,
  getTrashCities,
  getTrashClients,
} from "@/lib/clients";
import { getEmployees } from "@/lib/summary";
import { isClientSort } from "@/lib/client-types";
import { requireProfile } from "@/lib/auth";
import { canEmptyTrash } from "@/lib/types";

/**
 * Корзина — компании, убранные из холодной базы как нецелевые.
 *
 * Это не удаление: карточка со всей историей на месте, её можно вернуть
 * в базу одной кнопкой. Стереть насовсем может только руководство.
 */
export default async function TrashClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    owner?: string;
    city?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const ownerId = params.owner ?? "";
  const city = params.city ?? "";
  const sort = isClientSort(params.sort) ? params.sort : "created";
  const page = Math.max(1, Number(params.page) || 1);

  const profile = await requireProfile();

  // Корзину видят только те, кто убирает базу: остальным этот раздел
  // не нужен, а в меню он им и не показывается.
  if (!(await canCleanBase(profile))) {
    notFound();
  }

  const [{ clients, total }, employees, cities] = await Promise.all([
    getTrashClients({
      query,
      ownerId: ownerId || undefined,
      city: city || undefined,
      sort,
      page,
    }),
    getEmployees(),
    getTrashCities(),
  ]);

  const isFiltering = !!query || !!ownerId || !!city;
  const totalPages = Math.max(1, Math.ceil(total / COLD_PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow={
          isFiltering ? "Найдено по фильтру" : "Нецелевые компании, убранные из базы"
        }
        title="Корзина"
        count={total}
      />

      <ColdFilters
        basePath="/clients/trash"
        employees={employees}
        cities={cities}
        query={query}
        ownerId={ownerId}
        city={city}
        sort={sort}
      />

      <ClientTable
        clients={clients}
        variant="trash"
        selectable
        canClean
        canEmptyTrash={canEmptyTrash(profile.role)}
        employees={employees}
        emptyMessage={
          query
            ? `По запросу «${query}» ничего не нашлось.`
            : isFiltering
              ? "Под этот фильтр компаний нет."
              : "Корзина пуста. Сюда попадают компании, которые убрали из холодной базы как нецелевые."
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/clients/trash"
        searchParams={{
          ...(query && { q: query }),
          ...(ownerId && { owner: ownerId }),
          ...(city && { city }),
          ...(sort !== "created" && { sort }),
        }}
      />
    </>
  );
}
