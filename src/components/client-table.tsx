"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Trash2, UserCog } from "lucide-react";
import { SegmentBadge } from "@/components/segment-badge";
import {
  ARCHIVE_REASON_LABELS,
  BUSINESS_SIZE_LABELS,
  type ClientWithSegment,
} from "@/lib/client-types";
import { PACKAGE_LABELS, PACKAGE_STYLES } from "@/lib/packages";
import { STAGE_LABELS, STAGE_STYLES } from "@/lib/stages";
import { LoyaltyDot } from "@/components/client-loyalty";
import {
  bulkDeleteClients,
  bulkReassignClients,
  type ActionState,
} from "@/app/(app)/clients/actions";
import type { Employee } from "@/lib/summary-types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

function RenewalCell({ client }: { client: ClientWithSegment }) {
  if (client.days_to_renewal === null) return <span className="text-slate-400">—</span>;

  const days = client.days_to_renewal;

  if (days < 0) {
    return (
      <span className="font-medium text-red-700">
        просрочено на {Math.abs(days)} дн.
      </span>
    );
  }

  return (
    <span className={days <= 30 ? "font-medium text-amber-700" : "text-slate-600"}>
      через {days} дн.
    </span>
  );
}

/**
 * Панель массовых действий — плавает над таблицей, когда что-то выбрано.
 * Удаление и передача разрешены только руководителю (RLS и action всё
 * равно проверят роль ещё раз — это только про то, что видно в интерфейсе).
 */
function BulkActionsBar({
  selectedIds,
  employees,
  onDone,
}: {
  selectedIds: string[];
  employees: Employee[];
  onDone: () => void;
}) {
  const [reassigning, setReassigning] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [ownerId, setOwnerId] = useState("");

  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const result = await bulkDeleteClients(prevState, formData);
      if (result.ok) onDone();
      return result;
    },
    { error: null },
  );

  const [reassignState, reassignAction, reassignPending] = useActionState<
    ActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await bulkReassignClients(prevState, formData);
    if (result.ok) onDone();
    return result;
  }, { error: null });

  return (
    <div className="sticky top-0 z-10 mb-3 rounded-xl border border-brand bg-brand-soft px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-900">
          Выбрано: {selectedIds.length}
        </span>

        <button
          type="button"
          onClick={() => {
            setReassigning((v) => !v);
            setConfirmingDelete(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <UserCog className="size-3.5" />
          Назначить
        </button>

        <button
          type="button"
          onClick={() => {
            setConfirmingDelete((v) => !v);
            setReassigning(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          <Trash2 className="size-3.5" />
          Удалить
        </button>

        <button
          type="button"
          onClick={onDone}
          className="ml-auto text-sm text-slate-500 transition hover:text-slate-900"
        >
          Снять выделение
        </button>
      </div>

      {reassigning && (
        <form
          action={reassignAction}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="client_id" value={id} />
          ))}
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            name="owner_id"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="" disabled>
              Выберите сотрудника
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={reassignPending}
            className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
          >
            {reassignPending ? "Передаём…" : "Передать"}
          </button>
          {reassignState.error && (
            <p className="w-full text-sm text-red-700">{reassignState.error}</p>
          )}
        </form>
      )}

      {confirmingDelete && (
        <form action={deleteAction} className="mt-3 flex flex-wrap items-center gap-2">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="client_id" value={id} />
          ))}
          <p className="text-sm text-slate-700">
            Удалить {selectedIds.length} комп. без возможности восстановить?
          </p>
          <button
            type="submit"
            disabled={deletePending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deletePending ? "Удаляем…" : "Да, удалить"}
          </button>
          {deleteState.error && (
            <p className="w-full text-sm text-red-700">{deleteState.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

export function ClientTable({
  clients,
  variant,
  emptyMessage,
  selectable = false,
  canManage = false,
  employees = [],
}: {
  clients: ClientWithSegment[];
  variant: "cold" | "active" | "archived";
  emptyMessage: string;
  /** Показать чекбоксы и панель массовых действий. */
  selectable?: boolean;
  /** Может ли текущий пользователь удалять/передавать — иначе только просмотр. */
  canManage?: boolean;
  employees?: Employee[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const showSelection = selectable && canManage;
  const allSelected = showSelection && clients.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected((prev) => {
      if (clients.every((c) => prev.has(c.id))) return new Set();
      return new Set(clients.map((c) => c.id));
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {showSelection && selected.size > 0 && (
        <BulkActionsBar
          selectedIds={[...selected]}
          employees={employees}
          onDone={() => setSelected(new Set())}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {showSelection && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Выбрать все на странице"
                    className="size-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Компания</th>
              <th className="px-4 py-3 font-medium">Контакт</th>
              <th className="px-4 py-3 font-medium">Бизнес</th>
              {variant === "active" ? (
                <>
                  <th className="px-4 py-3 font-medium">Пакет</th>
                  <th className="px-4 py-3 font-medium">Этап</th>
                  <th className="px-4 py-3 font-medium">Сегмент</th>
                  <th className="px-4 py-3 font-medium">Месяц</th>
                  <th className="px-4 py-3 font-medium">Продление</th>
                  <th className="px-4 py-3 font-medium">Добавлен</th>
                </>
              ) : variant === "archived" ? (
                <>
                  <th className="px-4 py-3 font-medium">Причина</th>
                  <th className="px-4 py-3 font-medium">Убран</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">Добавлен</th>
                </>
              )}
              <th className="px-4 py-3 font-medium">Ответственный</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="transition hover:bg-slate-50">
                {showSelection && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(client.id)}
                      onChange={() => toggleOne(client.id)}
                      aria-label={`Выбрать ${client.name}`}
                      className="size-4 rounded border-slate-300 accent-[#7c3aed]"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="flex items-start gap-2">
                    {/* Светофор лояльности первым: список читается как карта
                        рисков — сразу видно, где клиент недоволен. */}
                    {variant === "active" && (
                      <span className="mt-1.5">
                        <LoyaltyDot loyalty={client.loyalty} />
                      </span>
                    )}
                    {/* Ссылка внутри строки, а не onClick на <tr>: строка остаётся
                        доступной с клавиатуры и открывается в новой вкладке. */}
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {client.name}
                    </Link>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {client.contact_person ?? "—"}
                  {client.phone && (
                    <span className="block text-xs text-slate-400">{client.phone}</span>
                  )}
                  {client.city && (
                    <span className="block text-xs text-slate-400">{client.city}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {client.business_size
                    ? BUSINESS_SIZE_LABELS[client.business_size]
                    : "—"}
                </td>

                {variant === "active" ? (
                  <>
                    <td className="px-4 py-3">
                      {client.package ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PACKAGE_STYLES[client.package]}`}
                        >
                          {PACKAGE_LABELS[client.package]}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {client.stage ? (
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLES[client.stage]}`}
                        >
                          {STAGE_LABELS[client.stage]}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SegmentBadge segment={client.segment} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {/* Месяц из скольких: у годового клиента 7-й месяц — норма. */}
                      {client.month_in_cycle
                        ? `${client.month_in_cycle} из ${client.contract_months}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RenewalCell client={client} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(client.created_at)}
                    </td>
                  </>
                ) : variant === "archived" ? (
                  <>
                    <td className="px-4 py-3 text-slate-600">
                      {client.archived_reason
                        ? ARCHIVE_REASON_LABELS[client.archived_reason]
                        : "—"}
                      {client.archived_comment && (
                        <span className="block text-xs text-slate-400">
                          {client.archived_comment}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(client.archived_at)}
                      {client.archived_by_name && (
                        <span className="block text-xs text-slate-400">
                          {client.archived_by_name}
                        </span>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-600">{client.source ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(client.created_at)}
                    </td>
                  </>
                )}

                <td className="px-4 py-3 text-slate-600">
                  {client.owner_name ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
