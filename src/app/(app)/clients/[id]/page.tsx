import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  getClient,
  getClientComments,
  getClientContacts,
  getClientDocuments,
  getClientPayments,
  getClientServices,
  getDocumentUrl,
} from "@/lib/clients";
import { getClientHistory, getClientOpenTasks } from "@/lib/tasks";
import { ARCHIVE_REASON_LABELS } from "@/lib/client-types";
import { requireProfile } from "@/lib/auth";
import { canManageStages, canManageUsers, canSeeDashboard } from "@/lib/types";
import { getEmployees } from "@/lib/summary";
import { getAllPricePositions, getAllRenewalPrices } from "@/lib/pricing-data";
import { formatTenge } from "@/lib/packages";
import { ClientHeader } from "@/components/client-header";
import { ClientNextStep } from "@/components/client-next-step";
import { ClientActivity } from "@/components/client-activity";
import { ClientAbout } from "@/components/client-about";
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
  MoveToWarmButton,
  RenewClientButton,
  RestoreClientButton,
} from "@/components/client-actions";
import { WarmDecision } from "@/components/warm-decision";
import { AddTaskForm } from "@/components/add-task-form";
import { segmentDescription } from "@/lib/segments";
import { todayISO } from "@/lib/dates";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    profile,
    client,
    contacts,
    documents,
    payments,
    services,
    positions,
    renewals,
    planned,
    history,
    notes,
  ] = await Promise.all([
    requireProfile(),
    getClient(id),
    getClientContacts(id),
    getClientDocuments(id),
    getClientPayments(id),
    getClientServices(id),
    getAllPricePositions(),
    getAllRenewalPrices(),
    getClientOpenTasks(id),
    getClientHistory(id),
    getClientComments(id),
  ]);

  // Клиента нет либо он чужой — RLS вернёт пусто в обоих случаях,
  // и это правильно: незачем подсказывать, что такой клиент существует.
  if (!client) {
    notFound();
  }

  // Подсказка цены продления на 12 мес — только если у КАЖДОЙ услуги клиента
  // есть цена в прайсе (Enterprise туда не входит — считается вручную).
  let renewalPriceHint: string | null = null;
  if (services.length > 0) {
    let sum = 0;
    let allMatched = true;
    for (const service of services) {
      const match = renewals.find(
        (r) =>
          r.city === service.city &&
          r.category === service.category &&
          r.package === service.package,
      );
      if (!match) {
        allMatched = false;
        break;
      }
      sum += match.renewalPrice;
    }
    if (allMatched) renewalPriceHint = formatTenge(sum);
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
      : client.status === "warm"
        ? "/clients/warm"
        : client.status === "archived"
          ? "/clients/archived"
          : "/clients/active";

  const backLabel =
    client.status === "cold"
      ? "Холодная база"
      : client.status === "warm"
        ? "Наработки"
        : client.status === "archived"
          ? "Архив"
          : "Текущие клиенты";

  // У клиента с выбранным пакетом блок «Пакет и договор» разворачивается
  // на всю ширину: там состав услуг, график платежей и КП.
  const hasPricing = services.length > 0 || !!client.package;
  const nextStep = planned[0] ?? null;

  return (
    <div className="max-w-[88rem]">
      <BackLink href={backHref} label={backLabel} />

      <ClientHeader
        client={client}
        taskAction={
          client.status !== "archived" ? (
            <AddTaskForm
              clients={[]}
              defaultClientId={client.id}
              defaultDueDate={todayISO()}
              contacts={contacts}
              defaultAddress={client.address}
              label="Задача"
            />
          ) : null
        }
        stageAction={
          <div className="flex flex-wrap items-center gap-2">
            {client.status === "cold" && (
              <>
                <MoveToWarmButton clientId={client.id} />
                <ActivateClientForm clientId={client.id} />
              </>
            )}
            {/* Те же три решения, что и в списке наработок, — чтобы из карточки
                они так же попадали в статистику Сводки. */}
            {client.status === "warm" && <WarmDecision clientIds={[client.id]} />}
            {client.status === "active" && (
              <>
                <RenewClientButton
                  clientId={client.id}
                  renewalDate={client.renewal_date}
                  renewalPriceHint={renewalPriceHint}
                />
                {canManageUsers(profile.role) && <ArchiveClientButton clientId={client.id} />}
              </>
            )}
          </div>
        }
      />

      {client.status === "archived" && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
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
          {canManageUsers(profile.role) && <RestoreClientButton clientId={client.id} />}
        </div>
      )}

      {client.status === "warm" && client.warm_reason && (
        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
          <p className="text-sm font-medium text-slate-900">Почему это наработка</p>
          <p className="mt-1 text-sm text-slate-600">{client.warm_reason}</p>
          {client.warm_response_date && (
            <p className="mt-1 text-sm font-medium text-orange-700">
              Ответ ожидается: {new Date(client.warm_response_date).toLocaleDateString("ru-RU")}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {client.warm_at && new Date(client.warm_at).toLocaleDateString("ru-RU")}
            {client.warm_by_name && ` · ${client.warm_by_name}`}
          </p>
        </div>
      )}

      {client.status === "active" && client.segment && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <SegmentBadge segment={client.segment} />
          <span className="text-sm text-slate-500">
            {segmentDescription(client.segment, client.contract_months)}
          </span>
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-5">
          {nextStep && <ClientNextStep task={nextStep} />}

          <ClientContacts
            clientId={client.id}
            contacts={contacts}
            fallback={
              client.contact_person
                ? `${client.contact_person}${client.phone ? `, ${client.phone}` : ""}`
                : null
            }
          />

          <ClientAbout
            client={client}
            employees={employees}
            canReassign={canManageUsers(profile.role)}
          />

          {client.status === "active" && <ClientPps client={client} />}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className={hasPricing ? "lg:col-span-2" : undefined}>
              <ClientPackage
                client={client}
                payments={payments}
                services={services}
                positions={positions}
              />
            </div>

            <div className={hasPricing ? "lg:col-span-2" : undefined}>
              <ClientDocuments
                clientId={client.id}
                documents={documents}
                urls={documentUrls}
                canManage={canSeeDashboard(profile.role)}
              />
            </div>
          </div>

          {/* Этап проекта и лояльность — только для клиентов в работе:
              у холодной базы ещё нет ни проекта, ни отношения к продукту. */}
          {client.status === "active" && (
            <>
              <ClientStage client={client} canManage={canManageStages(profile.role)} />
              <ClientLoyalty client={client} />
            </>
          )}
        </div>

        <div className="min-w-0 xl:sticky xl:top-7">
          <ClientActivity
            clientId={client.id}
            planned={planned}
            history={history}
            notes={notes}
          />
        </div>
      </div>
    </div>
  );
}
