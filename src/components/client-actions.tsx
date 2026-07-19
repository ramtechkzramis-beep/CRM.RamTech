"use client";

import { useActionState, useState } from "react";
import {
  activateClient,
  archiveClient,
  renewClient,
  restoreClient,
  type ActionState,
} from "@/app/(app)/clients/actions";
import { CLIENT_ARCHIVE_REASONS, ARCHIVE_REASON_LABELS } from "@/lib/client-types";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function ActivateClientForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    activateClient,
    { error: null },
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
      >
        Перевести в текущие
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input type="hidden" name="client_id" value={clientId} />

      <div className="space-y-1.5">
        <label htmlFor="signed_date" className="block text-sm font-medium text-slate-700">
          Дата подписания договора
        </label>
        <input
          id="signed_date"
          name="signed_date"
          type="date"
          required
          max={TODAY()}
          defaultValue={TODAY()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {/* Раньше тут спрашивали дату старта ППС — и он шёл, пока бота ещё
            разрабатывали. Теперь ППС стартует на этапе «Одобрен». */}
        <p className="text-xs text-slate-500">
          Клиент попадёт в воронку с этапа «Оформление».
          <br />
          ППС начнётся, когда проект дойдёт до «Одобрен».
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
      >
        {pending ? "Переводим…" : "Перевести"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
      >
        Отмена
      </button>

      {state.error && (
        <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RenewClientButton({
  clientId,
  renewalDate,
}: {
  clientId: string;
  renewalDate: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    renewClient,
    { error: null },
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Продлить
      </button>
    );
  }

  const nextCycleStart = renewalDate
    ? new Date(renewalDate).toLocaleDateString("ru-RU")
    : "—";

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="client_id" value={clientId} />

      <p className="mb-3 text-sm text-slate-700">
        Продлить договор? Новый цикл начнётся с {nextCycleStart}, клиент вернётся
        в ППС1.
      </p>

      {state.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
        >
          {pending ? "Продлеваем…" : "Да, продлить"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

/**
 * Убрать клиента из текущих — только у руководителя (admin), поэтому
 * компонент рендерится в карточке клиента лишь при canManage === true,
 * а server action и функция в БД проверяют роль ещё раз.
 */
export function ArchiveClientButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    archiveClient,
    { error: null },
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
      >
        Убрать из текущих
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4"
    >
      <input type="hidden" name="client_id" value={clientId} />

      <p className="text-sm font-medium text-slate-900">
        Убрать клиента из текущих?
      </p>

      <div className="space-y-1.5">
        <label htmlFor="reason" className="text-sm font-medium text-slate-700">
          Причина
        </label>
        <select
          id="reason"
          name="reason"
          required
          defaultValue=""
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="" disabled>
            Выберите причину
          </option>
          {CLIENT_ARCHIVE_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {ARCHIVE_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="comment" className="text-sm font-medium text-slate-700">
          Комментарий (необязательно)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={2}
          placeholder="Детали — пригодятся, если вернётесь к этому клиенту позже"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Убираем…" : "Да, убрать"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

export function RestoreClientButton({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    restoreClient,
    { error: null },
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-2">
      <input type="hidden" name="client_id" value={clientId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
      >
        {pending ? "Восстанавливаем…" : "Восстановить в текущие"}
      </button>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
