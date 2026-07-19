import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientTable } from "@/components/client-table";
import { getArchivedClients } from "@/lib/clients";

export default async function ArchivedClientsPage() {
  const clients = await getArchivedClients();

  return (
    <>
      <PageHeader
        title="Архив"
        subtitle={`Убрано из текущих: ${clients.length}`}
        action={
          <Link
            href="/clients/active"
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← Текущие клиенты
          </Link>
        }
      />

      <ClientTable
        clients={clients}
        variant="archived"
        emptyMessage="Пока никого не убирали из текущих клиентов."
      />
    </>
  );
}
