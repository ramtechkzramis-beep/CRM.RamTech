"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditClientForm } from "@/components/edit-client-form";
import { ClientOwner } from "@/components/client-owner";
import { BUSINESS_SIZE_LABELS, type ClientWithSegment } from "@/lib/client-types";
import type { Employee } from "@/lib/summary-types";

/**
 * Карточка «О компании».
 *
 * Пустое поле — это не прочерк, а приглашение заполнить: ссылка «+ Указать»
 * открывает ту же форму редактирования, что и карандаш в углу, чтобы
 * менеджер не искал, где дописать адрес.
 */
export function ClientAbout({
  client,
  employees,
  canReassign,
}: {
  client: ClientWithSegment;
  employees: Employee[];
  canReassign: boolean;
}) {
  const [editing, setEditing] = useState(false);

  function Field({
    label,
    value,
    action,
  }: {
    label: string;
    value: React.ReactNode;
    action?: React.ReactNode;
  }) {
    return (
      <div>
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-900">
          {value ?? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-brand transition hover:text-brand-dark"
            >
              + Указать
            </button>
          )}
          {action}
        </dd>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-slate-900">О компании</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Редактировать компанию"
          title="Редактировать компанию"
          className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <dl className="grid gap-5 sm:grid-cols-2">
        <Field label="Город" value={client.city} />
        <Field
          label="Размер бизнеса"
          value={client.business_size ? BUSINESS_SIZE_LABELS[client.business_size] : null}
        />
        <Field label="Адрес" value={client.address} />
        <Field
          label="2ГИС"
          value={
            client.dgis_url ? (
              <a
                href={client.dgis_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand transition hover:text-brand-dark"
              >
                Открыть карточку ↗
              </a>
            ) : null
          }
        />
        <Field label="Источник" value={client.source} />
        <Field
          label="Ответственный"
          value={client.owner_name}
          action={
            canReassign ? (
              <ClientOwner
                clientId={client.id}
                ownerId={client.owner_id}
                ownerName={client.owner_name}
                employees={employees}
              />
            ) : null
          }
        />
      </dl>

      {client.notes && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <dt className="text-sm text-slate-500">Примечание</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{client.notes}</dd>
        </div>
      )}

      {/* Форма одна на всю карточку — открывается и карандашом, и «+ Указать». */}
      <EditClientForm
        client={client}
        open={editing}
        onOpenChange={setEditing}
        hideTrigger
      />
    </div>
  );
}
