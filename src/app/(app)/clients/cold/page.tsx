import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { AddClientForm } from "@/components/add-client-form";
import { ImportClientsForm } from "@/components/import-clients-form";
import { ColdFilters } from "@/components/cold-filters";
import { Pagination } from "@/components/pagination";
import { COLD_PAGE_SIZE, getColdClients, getColdCities } from "@/lib/clients";
import { getEmployees } from "@/lib/summary";
import { isClientSort } from "@/lib/client-types";
import { requireProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/types";

export default async function ColdClientsPage({
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
    getColdClients({
      query,
      ownerId: ownerId || undefined,
      city: city || undefined,
      sort,
      page,
    }),
    getEmployees(),
    getColdCities(),
  ]);

  const isFiltering = !!query || !!ownerId || !!city;
  const totalPages = Math.max(1, Math.ceil(total / COLD_PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow={isFiltering ? "Найдено по фильтру" : "Потенциальные клиенты"}
        title="Холодная база"
        count={total}
        action={
          <div className="flex gap-2">
            <ImportClientsForm />
            <AddClientForm />
          </div>
        }
      />

      <ColdFilters
        employees={employees}
        cities={cities}
        query={query}
        ownerId={ownerId}
        city={city}
        sort={sort}
      />

      <ClientTable
        clients={clients}
        variant="cold"
        selectable
        canManage={canManageUsers(profile.role)}
        employees={employees}
        emptyMessage={
          query
            ? `По запросу «${query}» ничего не нашлось.`
            : isFiltering
              ? "Под этот фильтр клиентов нет."
              : "Пока никого нет. Нажмите «Добавить клиента» или загрузите базу из Excel."
        }
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/clients/cold"
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
