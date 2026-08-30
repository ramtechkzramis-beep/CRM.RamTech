import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { ColdFilters } from "@/components/cold-filters";
import { Pagination } from "@/components/pagination";
import { COLD_PAGE_SIZE, getWarmClients, getWarmCities } from "@/lib/clients";
import { getEmployees } from "@/lib/summary";
import { isClientSort } from "@/lib/client-types";
import { requireProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/types";

/**
 * Наработки — компании после встречи с менеджером, готовые работать
 * с нами на 70-80%. Промежуточный статус между холодной базой и текущими
 * клиентами; сюда не добавляют напрямую — только переводом из холодной базы.
 */
export default async function WarmClientsPage({
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

  const [profile, { clients, total }, employees, cities] = await Promise.all([
    requireProfile(),
    getWarmClients({
      query,
      ownerId: ownerId || undefined,
      city: city || undefined,
      sort,
      page,
    }),
    getEmployees(),
    getWarmCities(),
  ]);

  const isFiltering = !!query || !!ownerId || !!city;
  const totalPages = Math.max(1, Math.ceil(total / COLD_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Наработки"
        subtitle={
          isFiltering
            ? `Найдено: ${total}`
            : `После встречи, готовы работать с нами: ${total}. Страница ${page} из ${totalPages}.`
        }
      />

      <ColdFilters
        basePath="/clients/warm"
        employees={employees}
        cities={cities}
        dates={[]}
        query={query}
        ownerId={ownerId}
        city={city}
        addedDate=""
        sort={sort}
      />

      <ClientTable
        clients={clients}
        variant="warm"
        selectable
        canManage={canManageUsers(profile.role)}
        employees={employees}
        emptyMessage={
          query
            ? `По запросу «${query}» ничего не нашлось.`
            : isFiltering
              ? "Под этот фильтр компаний нет."
              : "Пока пусто. Компании появятся здесь после того, как менеджер переведёт их сюда из холодной базы."
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/clients/warm"
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
