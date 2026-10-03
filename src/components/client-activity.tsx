"use client";

import { useActionState, useRef, useState } from "react";
import { addClientNote, type ActionState } from "@/app/(app)/clients/actions";
import {
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
  type TaskWithRelations,
} from "@/lib/task-types";
import { formatTimeRu } from "@/lib/dates";
import type { ClientComment } from "@/lib/client-types";

type Tab = "all" | "tasks" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Всё" },
  { key: "tasks", label: "Задачи" },
  { key: "notes", label: "Заметки" },
];

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** «21 сентября, 08:06» — в этом году без года, иначе с ним. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  const isThisYear = date.getFullYear() === new Date().getFullYear();

  return isThisYear ? `${day}, ${time}` : `${day} ${date.getFullYear()}, ${time}`;
}

/** «4 октября, 11:00» — срок задачи, время только если оно задано. */
function formatDue(dueDate: string, dueTime: string | null): string {
  const date = new Date(`${dueDate}T00:00:00`);
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  const time = formatTimeRu(dueTime);

  return time ? `${day}, ${time}` : day;
}

function Dot({ className }: { className: string }) {
  return <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${className}`} />;
}

function taskDot(task: TaskWithRelations): string {
  if (!task.outcome) return "bg-slate-300";
  const tone = OUTCOME_TONE[task.outcome];
  return tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-red-400" : "bg-amber-400";
}

/**
 * Активность по клиенту: что запланировано, что уже сделали и заметки
 * менеджеров — одной лентой справа от карточки.
 *
 * Вкладки нужны, потому что вопросы разные: «когда следующий контакт»
 * и «что писали про этого клиента» — и смешанная лента отвечает на оба
 * хуже, чем каждая по отдельности.
 */
export function ClientActivity({
  clientId,
  planned,
  history,
  notes,
}: {
  clientId: string;
  planned: TaskWithRelations[];
  history: TaskWithRelations[];
  notes: ClientComment[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const result = await addClientNote(prevState, formData);
      // Поле чистим только после успеха: иначе текст пропал бы вместе
      // с ошибкой, и писать пришлось бы заново.
      if (result.ok) formRef.current?.reset();
      return result;
    },
    { error: null },
  );

  const doneTasks = history.filter((task) => task.completed_at);

  type Item =
    | { kind: "task"; at: string; task: TaskWithRelations }
    | { kind: "note"; at: string; note: ClientComment };

  const items: Item[] = [
    ...(tab === "notes"
      ? []
      : doneTasks.map((task) => ({ kind: "task" as const, at: task.completed_at!, task }))),
    ...(tab === "tasks"
      ? []
      : notes.map((note) => ({ kind: "note" as const, at: note.created_at, note }))),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const showPlanned = tab !== "notes" && planned.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-slate-900">Активность</h2>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={tab === item.key}
              className={`rounded-lg px-3 py-1 text-sm transition ${
                tab === item.key
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form ref={formRef} action={formAction} className="mt-4">
        <input type="hidden" name="client_id" value={clientId} />
        <div className="rounded-xl border border-slate-200 p-2.5">
          <textarea
            name="text"
            rows={2}
            placeholder="Оставить заметку о клиенте…"
            className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </div>
        {state.error && <p className="mt-1.5 text-sm text-red-700">{state.error}</p>}
      </form>

      {showPlanned && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Запланировано</p>
          <ul className="mt-2 space-y-3">
            {planned.map((task) => (
              <li key={task.id} className="flex gap-2.5">
                <Dot className="bg-brand" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-semibold text-slate-900">
                      {TASK_TYPE_LABELS[task.type]}
                    </span>
                    <span className="text-slate-500">
                      {formatDue(task.due_date, task.due_time)}
                    </span>
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-sm text-slate-600">{task.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">История</p>

        {items.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {tab === "notes"
              ? "Заметок пока нет."
              : "С этой компанией ещё не работали — история появится после первой закрытой задачи."}
          </p>
        ) : (
          <ul className="mt-2 space-y-3.5">
            {items.map((item) =>
              item.kind === "task" ? (
                <li key={`task-${item.task.id}`} className="flex gap-2.5">
                  <Dot className={taskDot(item.task)} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-900">
                        {TASK_TYPE_LABELS[item.task.type]}
                      </span>
                      {item.task.outcome && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[item.task.outcome]]}`}
                        >
                          {OUTCOME_LABELS[item.task.outcome]}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatWhen(item.at)}
                      {item.task.assignee && ` · ${item.task.assignee.full_name}`}
                    </p>
                    {item.task.outcome_note && (
                      <p className="mt-1.5 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {item.task.outcome_note}
                      </p>
                    )}
                  </div>
                </li>
              ) : (
                <li key={`note-${item.note.id}`} className="flex gap-2.5">
                  <Dot className="bg-slate-300" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{item.note.text}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatWhen(item.at)}
                      {item.note.author_name && ` · ${item.note.author_name}`}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
