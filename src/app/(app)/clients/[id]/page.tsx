import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getClient,
  getClientContacts,
  getClientDocuments,
  getClientPayments,
  getDocumentUrl,
} from "@/lib/clients";
import { ARCHIVE_REASON_LABELS, BUSINESS_SIZE_LABELS } from "@/lib/client-types";
import { requireProfile } from "@/lib/auth";
import { canManageStages, canManageUsers, canSeeDashboard } from "@/lib/types";
import { getEmployees } from "@/lib/summary";
import { ClientOwner } from "@/components/client-owner";
import { EditClientForm } from "@/components/edit-client-form";
import { ClientContacts } from "@/components/client-contacts";
import { ClientPackage } from "@/components/client-package";
import { ClientPps } from "@/components/client-pps";
import { ClientStage } from "@/components/client-stage";
import { ClientLoyalty } from "@/components/client-loyalty";
import { ClientDocuments } from "@/components/client-documents";
import { SegmentBadge } from "@/components/segment-badge";
import {
  ActivateClientForm,
  ArchiveClientButton,
  RenewClientButton,
  RestoreClientButton,
} from "@/components/client-actions";
import { AddTaskForm } from "@/components/add-task-form";
import { TodaySidebar } from "@/components/today-sidebar";
import { segmentDescription } from "@/lib/segments";
import { todayISO } from "@/lib/dates";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, client, contacts, documents, payments] = await Promise.all([
    requireProfile(),
    getClient(id),
    getClientContacts(id),
    getClientDocuments(id),
    getClientPayments(id),
  ]);

  // Клиента нет либо он чужой — RLS вернёт пусто в обоих случаях,
  // и это правильно: незачем подсказывать, что такой клиент существует.
  if (!client) {
    notFound();
  }

  // Список сотрудников нужен только руководителю — для передачи клиента.
  const employees = canManageUsers(profile.role) ? await getEmployees() : [];

  // Бакет приватный, поэтому на каждый файл берём временную ссылку.
  const documentUrls = Object.fromEntries(
    await Promise.all(
      documents.map(async (doc) => [doc.id, await getDocumentUrl(doc.storage_path)]),
    ),
  ) as Record<string, string | null>;

  const backHref =
    client.status === "cold"
      ? "/clients/cold"
      : client.status === "archived"
        ? "/clients/archived"
        : "/clients/active";

  return (
    <div className="flex max-w-[90rem] items-start gap-8">
      {/* Панель задач справа: планируя действие по клиенту, менеджер видит,
          чем уже занят день, и не ставит встречу поверх другой. */}
      <div className="min-w-0 flex-1">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        {client.status === "cold"
          ? "Холодная база"
          : client.status === "archived"
            ? "Архив"
            : "Текущие клиенты"}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            {client.status === "cold" ? (
              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                Холодная база
              </span>
            ) : client.status === "archived" ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                В архиве
              </span>
            ) : (
              <>
                <SegmentBadge segment={client.segment} />
                {client.segment && (
                  <span className="text-sm text-slate-500">
                    {segmentDescription(client.segment, client.contract_months)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {client.status !== "archived" && (
            <AddTaskForm
              clients={[]}
              defaultClientId={client.id}
              defaultDueDate={todayISO()}
            />
          )}
          {client.status === "cold" && <ActivateClientForm clientId={client.id} />}
          {client.status === "active" && (
            <>
              <RenewClientButton
                clientId={client.id}
                renewalDate={client.renewal_date}
              />
              {canManageUsers(profile.role) && (
                <ArchiveClientButton clientId={client.id} />
              )}
            </>
          )}
          {client.status === "archived" && canManageUsers(profile.role) && (
            <RestoreClientButton clientId={client.id} />
          )}
        </div>
      </div>

      {client.status === "archived" && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">
            Убран из текущих
            {client.archived_reason && `: ${ARCHIVE_REASON_LABELS[client.archived_reason]}`}
          </p>
          {client.archived_comment && (
            <p className="mt-1 text-sm text-slate-600">{client.archived_comment}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {client.archived_at && new Date(client.archived_at).toLocaleDateString("ru-RU")}
            {client.archived_by_name && ` · ${client.archived_by_name}`}
          </p>
        </div>
      )}

      {client.status === "active" && (
        <div className="mb-6">
          <ClientPps client={client} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">О компании</h2>
          <EditClientForm client={client} />
        </div>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Город" value={client.city} />
          <Field
            label="Размер бизнеса"
            value={
              client.business_size
                ? BUSINESS_SIZE_LABELS[client.business_size]
                : null
            }
          />
          <Field label="Источник" value={client.source} />
          <Field
            label="Ответственный"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {client.owner_name ?? "—"}
                {canManageUsers(profile.role) && (
                  <ClientOwner
                    clientId={client.id}
                    ownerId={client.owner_id}
                    ownerName={client.owner_name}
                    employees={employees}
                  />
                )}
              </span>
            }
          />
        </dl>

        {client.notes && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Заметки
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {client.notes}
            </dd>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ClientPackage client={client} payments={payments} />
      </div>

      {/* Этап проекта и лояльность — только для клиентов в работе: у холодной
          базы ещё нет ни проекта, ни отношения к продукту. */}
      {client.status === "active" && (
        <>
          <div className="mt-6">
            <ClientStage client={client} canManage={canManageStages(profile.role)} />
          </div>
          <div className="mt-6">
            <ClientLoyalty client={client} />
          </div>
        </>
      )}

      <div className="mt-6">
        <ClientContacts
          clientId={client.id}
          contacts={contacts}
          fallback={
            client.contact_person
              ? `${client.contact_person}${client.phone ? `, ${client.phone}` : ""}`
              : null
          }
        />
      </div>

      <div className="mt-6">
        <ClientDocuments
          clientId={client.id}
          documents={documents}
          urls={documentUrls}
          canManage={canSeeDashboard(profile.role)}
        />
      </div>

      </div>

      <TodaySidebar profileId={profile.id} clientId={client.id} />
    </div>
  );
}
