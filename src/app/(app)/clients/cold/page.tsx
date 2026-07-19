import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { AddClientForm } from "@/components/add-client-form";
import { ImportClientsForm } from "@/components/import-clients-form";
import { ColdFilters } from "@/components/cold-filters";
import { Pagination } from "@/components/pagination";
import { COLD_PAGE_SIZE, getColdClients, getColdCities, getColdAddedDates } from "@/lib/clients";
import { getEmployees } from "@/lib/summary";
import { isClientSort } from "@/lib/client-types";

export default async function ColdClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    owner?: string;
    city?: string;
    added?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const ownerId = params.owner ?? "";
  const city = params.city ?? "";
  const addedDate = params.added ?? "";
  const sort = isClientSort(params.sort) ? params.sort : "created";
  const page = Math.max(1, Number(params.page) || 1);

  const [{ clients, total }, employees, cities, dates] = await Promise.all([
    getColdClients({
      query,
      ownerId: ownerId || undefined,
      city: city || undefined,
      addedDate: addedDate || undefined,
      sort,
      page,
    }),
    getEmployees(),
    getColdCities(),
    getColdAddedDates(),
  ]);

  const isFiltering = !!query || !!ownerId || !!city || !!addedDate;
  const totalPages = Math.max(1, Math.ceil(total / COLD_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Холодная база"
        subtitle={
          isFiltering
            ? `Найдено: ${total}`
            : `Потенциальные клиенты: ${total}. Страница ${page} из ${totalPages}.`
        }
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
        dates={dates}
        query={query}
        ownerId={ownerId}
        city={city}
        addedDate={addedDate}
        sort={sort}
      />

      <ClientTable
        clients={clients}
        variant="cold"
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
          ...(addedDate && { added: addedDate }),
          ...(sort !== "created" && { sort }),
        }}
      />
    </>
  );
}
