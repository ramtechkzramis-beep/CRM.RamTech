"use client";

import { useActionState, useId, useState } from "react";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import {
  postponeWarmClients,
  refuseWarmClients,
  signWarmClients,
  type ActionState,
} from "@/app/(app)/clients/actions";

type Mode = "sign" | "refuse" | "postpone";

/** Сегодня по местному времени: toISOString дал бы UTC, а в Казахстане до 5 утра это ещё вчера. */
function localTodayISO() {
  return new Date().toLocaleDateString("sv-SE");
}

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const MODE_BUTTONS: {
  mode: Mode;
  label: string;
  icon: typeof CheckCircle2;
  className: string;
}[] = [
  {
    mode: "sign",
    label: "Оформлен",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    mode: "refuse",
    label: "Отказ",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  {
    mode: "postpone",
    label: "Перенос даты ответа",
    icon: CalendarClock,
    className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
];

function ErrorText({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
}

function FormFooter({
  pending,
  label,
  pendingLabel,
  onCancel,
  danger = false,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={pending}
        className={
          danger
            ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            : "rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
        }
      >
        {pending ? pendingLabel : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
      >
        Отмена
      </button>
    </div>
  );
}

/**
 * Решение по наработке: оформлен, отказ или перенос даты ответа.
 *
 * Один и тот же блок стоит в карточке компании и в панели выделенных строк
 * списка наработок — чтобы решение принималось одинаково и одинаково
 * попадало в статистику Сводки.
 */
export function WarmDecision({
  clientIds,
  onDone,
}: {
  clientIds: string[];
  /** Вызывается после успешного решения — например, снять выделение в списке. */
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const idPrefix = useId();
  const today = localTodayISO();

  function finish(result: ActionState) {
    if (result.ok) {
      setMode(null);
      onDone?.();
    }
    return result;
  }

  const [signState, signAction, signPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => finish(await signWarmClients(prevState, formData)),
    { error: null },
  );
  const [refuseState, refuseAction, refusePending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => finish(await refuseWarmClients(prevState, formData)),
    { error: null },
  );
  const [postponeState, postponeAction, postponePending] = useActionState<
    ActionState,
    FormData
  >(
    async (prevState, formData) => finish(await postponeWarmClients(prevState, formData)),
    { error: null },
  );

  const countSuffix = clientIds.length > 1 ? ` · ${clientIds.length} комп.` : "";
  const hiddenIds = clientIds.map((id) => (
    <input key={id} type="hidden" name="client_id" value={id} />
  ));
  const cancel = () => setMode(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {MODE_BUTTONS.map(({ mode: buttonMode, label, icon: Icon, className }) => (
          <button
            key={buttonMode}
            type="button"
            onClick={() => setMode(mode === buttonMode ? null : buttonMode)}
            aria-pressed={mode === buttonMode}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${className} ${
              mode === buttonMode ? "ring-2 ring-brand/40" : ""
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "sign" && (
        <form
          action={signAction}
          className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          {hiddenIds}
          <p className="text-sm font-medium text-slate-900">Компания оформлена{countSuffix}</p>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-signed`}
              className="block text-sm font-medium text-slate-700"
            >
              Дата подписания договора
            </label>
            <input
              id={`${idPrefix}-signed`}
              name="signed_date"
              type="date"
              required
              max={today}
              defaultValue={today}
              className={INPUT_CLASS}
            />
            <p className="text-xs text-slate-500">
              Перейдёт в «Текущие клиенты» с этапа «Оформление». ППС начнётся, когда проект
              дойдёт до «Одобрен».
            </p>
          </div>

          <ErrorText state={signState} />
          <FormFooter
            pending={signPending}
            label="Оформить"
            pendingLabel="Оформляем…"
            onCancel={cancel}
          />
        </form>
      )}

      {mode === "refuse" && (
        <form
          action={refuseAction}
          className="max-w-md space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4"
        >
          {hiddenIds}
          <p className="text-sm font-medium text-slate-900">Отказ{countSuffix}</p>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-refuse-note`}
              className="block text-sm font-medium text-slate-700"
            >
              Причина отказа
            </label>
            <textarea
              id={`${idPrefix}-refuse-note`}
              name="note"
              rows={2}
              placeholder="Например: выбрали другого подрядчика, не согласовали бюджет"
              className={INPUT_CLASS}
            />
            <p className="text-xs text-slate-500">Компания вернётся в холодную базу.</p>
          </div>

          <ErrorText state={refuseState} />
          <FormFooter
            pending={refusePending}
            label="Отказ — в холодную базу"
            pendingLabel="Переводим…"
            onCancel={cancel}
            danger
          />
        </form>
      )}

      {mode === "postpone" && (
        <form
          action={postponeAction}
          className="max-w-md space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4"
        >
          {hiddenIds}
          <p className="text-sm font-medium text-slate-900">Перенос даты ответа{countSuffix}</p>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-response`}
              className="block text-sm font-medium text-slate-700"
            >
              Новая дата ответа
            </label>
            <input
              id={`${idPrefix}-response`}
              name="response_date"
              type="date"
              required
              min={today}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-postpone-note`}
              className="block text-sm font-medium text-slate-700"
            >
              Что сказал клиент
            </label>
            <textarea
              id={`${idPrefix}-postpone-note`}
              name="note"
              rows={2}
              placeholder="Например: директор в отпуске до конца месяца"
              className={INPUT_CLASS}
            />
          </div>

          <ErrorText state={postponeState} />
          <FormFooter
            pending={postponePending}
            label="Перенести"
            pendingLabel="Переносим…"
            onCancel={cancel}
          />
        </form>
      )}
    </div>
  );
}
