import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { AddClientForm } from "@/components/add-client-form";
import { ImportClientsForm } from "@/components/import-clients-form";
import { ColdFilters } from "@/components/cold-filters";
import { getColdClients, getColdCities, getColdAddedDates } from "@/lib/clients";
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
  }>;
}) {
  const params = await searchParams;

  const query = params.q?.trim() ?? "";
  const ownerId = params.owner ?? "";
  const city = params.city ?? "";
  const addedDate = params.added ?? "";
  const sort = isClientSort(params.sort) ? params.sort : "created";

  const [clients, employees, cities, dates] = await Promise.all([
    getColdClients({
      query,
      ownerId: ownerId || undefined,
      city: city || undefined,
      addedDate: addedDate || undefined,
      sort,
    }),
    getEmployees(),
    getColdCities(),
    getColdAddedDates(),
  ]);

  const isFiltering = !!query || !!ownerId || !!city || !!addedDate;

  return (
    <>
      <PageHeader
        title="Холодная база"
        subtitle={
          isFiltering
            ? `Найдено: ${clients.length}`
            : `Потенциальные клиенты: ${clients.length}`
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
    </>
  );
}
