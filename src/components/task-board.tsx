"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MapPin, MessageCircle, Phone } from "lucide-react";
import { CloseTaskForm } from "@/components/close-task-form";
import { EditTaskForm } from "@/components/edit-task-form";
import { buildMeetingText } from "@/components/meeting-brief";
import { rescheduleTask, type TaskActionState } from "@/app/(app)/today/actions";
import {
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
  type TaskType,
  type TaskWithRelations,
} from "@/lib/task-types";
import { formatDayLabelRu, formatTimeRu } from "@/lib/dates";
import { telHref, whatsAppHref } from "@/lib/phone";

export type TaskGroupData = {
  key: string;
  title: string;
  tone?: "default" | "danger";
  tasks: TaskWithRelations[];
  /** Чем заполнить группу, если задач нет. */
  emptyTitle?: string;
  emptyHint?: string | null;
};

/** Сколько задач показываем в группе до нажатия «Показать ещё». */
const VISIBLE_IN_GROUP = 3;

/** Подпись главной кнопки в панели — по типу задачи. */
const DONE_LABELS: Record<TaskType, string> = {
  call: "Звонок сделан",
  meeting: "Встреча проведена",
  payment: "Оплата получена",
  service: "Задача выполнена",
};

function pluralTasks(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "задачу";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задачи";
  return "задач";
}

/**
 * Комментарий менеджера — списком пунктов. Пишут их по-разному: кто
 * с новой строки, кто подряд «1. ... 2. ...», поэтому разбираем оба случая.
 */
function commentItems(text: string): string[] {
  const strip = (value: string) => value.replace(/^\d+\s*[.)]\s*/, "").trim();

  const byLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (byLines.length > 1) return byLines.map(strip);

  return text
    .split(/\s*(?=\d+\s*[.)]\s*\S)/)
    .map((part) => strip(part))
    .filter(Boolean);
}

function taskTitle(task: TaskWithRelations): string {
  return task.client?.name ?? task.title;
}

function taskSubtitle(task: TaskWithRelations): string | null {
  if (task.contact) {
    return task.contact.phone
      ? `${task.contact.full_name} · ${task.contact.phone}`
      : task.contact.full_name;
  }
  return task.description?.split(/\r?\n/)[0] ?? null;
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: TaskWithRelations;
  selected: boolean;
  onSelect: () => void;
}) {
  const time = formatTimeRu(task.due_time);
  const subtitle = taskSubtitle(task);
  const isDone = task.status === "done";

  return (
    <li
      className={`flex items-start gap-3 px-4 py-3.5 transition ${
        selected ? "bg-brand-soft" : "hover:bg-slate-50"
      }`}
    >
      <div className="pt-1">
        {isDone ? (
          <span className="flex size-5 items-center justify-center rounded border border-emerald-500 bg-emerald-500 text-white">
            <Check className="size-3.5" />
          </span>
        ) : (
          <CloseTaskForm task={task} />
        )}
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-4 text-left"
      >
        <span
          className={`w-14 shrink-0 text-[17px] font-semibold ${
            isDone ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {time ?? "—"}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] font-medium ${
              isDone ? "text-slate-400 line-through" : "text-slate-900"
            }`}
          >
            {taskTitle(task)}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-sm text-slate-500">{subtitle}</span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {task.outcome && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[task.outcome]]}`}
            >
              {OUTCOME_LABELS[task.outcome]}
            </span>
          )}
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${TASK_TYPE_STYLES[task.type]}`}
          >
            {TASK_TYPE_LABELS[task.type]}
          </span>
        </span>
      </button>
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="w-32 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function TaskDetail({
  task,
  today,
  currentUserId,
  canManageAll,
}: {
  task: TaskWithRelations;
  today: string;
  currentUserId: string;
  canManageAll: boolean;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(
    async (prevState, formData) => {
      const result = await rescheduleTask(prevState, formData);
      if (result.ok) setRescheduling(false);
      return result;
    },
    { error: null },
  );

  const time = formatTimeRu(task.due_time);
  const phone = task.contact?.phone ?? null;
  const address = task.location ?? task.client?.address ?? null;
  const dgisUrl = task.client?.dgis_url ?? null;
  const isDone = task.status === "done";
  const canEdit = canManageAll || task.assignee_id === currentUserId;
  const comment = task.description ? commentItems(task.description) : [];

  async function copyBrief() {
    const text = buildMeetingText({
      company: task.client?.name ?? null,
      dgisUrl,
      address,
      contactName: task.contact?.full_name ?? null,
      phone,
      date: task.due_date,
      time: task.due_time,
      comment: task.description,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер закрыт настройками браузера — текст виден на экране.
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${TASK_TYPE_STYLES[task.type]}`}
          >
            {TASK_TYPE_LABELS[task.type]}
          </span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            {formatDayLabelRu(task.due_date, today)}
            {time && ` · ${time}`}
          </span>
          {task.outcome && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[OUTCOME_TONE[task.outcome]]}`}
            >
              {OUTCOME_LABELS[task.outcome]}
            </span>
          )}
        </div>
        {canEdit && !isDone && <EditTaskForm task={task} />}
      </div>

      <h2 className="mt-3 text-xl font-semibold text-slate-900">
        {task.client ? (
          <Link href={`/clients/${task.client.id}`} className="hover:underline">
            {task.client.name}
          </Link>
        ) : (
          task.title
        )}
      </h2>

      {address && (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>{address}</span>
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={telHref(phone)}
          aria-disabled={!phone}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            phone
              ? "bg-brand text-white hover:bg-brand-dark"
              : "pointer-events-none bg-slate-100 text-slate-400"
          }`}
        >
          <Phone className="size-4" />
          Позвонить
        </a>

        <a
          href={whatsAppHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!phone}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            phone
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "pointer-events-none bg-slate-100 text-slate-400"
          }`}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>

        <a
          href={dgisUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!dgisUrl}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            dgisUrl
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "pointer-events-none border-slate-200 bg-white text-slate-300"
          }`}
        >
          <ExternalLink className="size-4" />
          Открыть в 2ГИС
        </a>

        <button
          type="button"
          onClick={copyBrief}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {task.contact && <DetailRow label="ЛПР" value={task.contact.full_name} />}
        {phone && <DetailRow label="Телефон" value={phone} />}
        {task.assignee && <DetailRow label="Ответственный" value={task.assignee.full_name} />}
      </div>

      {comment.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Комментарий</p>
          <ol className="mt-2 space-y-1.5">
            {comment.map((item, index) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700">
                <span className="shrink-0 text-slate-400">{index + 1}.</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {task.outcome_note && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Итог</p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{task.outcome_note}</p>
        </div>
      )}

      {!isDone && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          {rescheduling ? (
            <form action={formAction} className="space-y-2">
              <input type="hidden" name="task_id" value={task.id} />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="due_date"
                  required
                  defaultValue={task.due_date}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <input
                  type="time"
                  name="due_time"
                  defaultValue={formatTimeRu(task.due_time) ?? ""}
                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              {state.error && <p className="text-sm text-red-700">{state.error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {pending ? "Переносим…" : "Сохранить дату"}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduling(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRescheduling(true)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Перенести
              </button>
              <CloseTaskForm task={task} trigger="button" label={DONE_LABELS[task.type]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Экран задач: слева список по дням, справа выбранная задача.
 *
 * Панель справа заменила разворачивание строки: по встрече нужны телефон,
 * адрес и 2ГИС сразу, а в строке списка им места нет.
 */
export function TaskBoard({
  groups,
  today,
  currentUserId,
  canManageAll,
}: {
  groups: TaskGroupData[];
  today: string;
  currentUserId: string;
  canManageAll: boolean;
}) {
  const allTasks = useMemo(() => groups.flatMap((group) => group.tasks), [groups]);

  const [selectedId, setSelectedId] = useState<string | null>(
    () => allTasks.find((task) => task.status === "open")?.id ?? allTasks[0]?.id ?? null,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const selected = allTasks.find((task) => task.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        {groups.map((group) => {
          const isExpanded = expanded[group.key] ?? false;
          const visible = isExpanded ? group.tasks : group.tasks.slice(0, VISIBLE_IN_GROUP);
          const hidden = group.tasks.length - visible.length;

          return (
            <section key={group.key}>
              <h2
                className={`mb-2 text-[11px] uppercase tracking-wider ${
                  group.tone === "danger" ? "text-red-600" : "text-slate-400"
                }`}
              >
                {group.title} · {group.tasks.length}
              </h2>

              {group.tasks.length === 0 ? (
                group.emptyTitle ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Check className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-slate-900">{group.emptyTitle}</p>
                      {group.emptyHint && (
                        <p className="text-sm text-slate-500">{group.emptyHint}</p>
                      )}
                    </div>
                  </div>
                ) : null
              ) : (
                <div
                  className={`overflow-hidden rounded-2xl border bg-white ${
                    group.tone === "danger" ? "border-red-200" : "border-slate-200"
                  }`}
                >
                  <ul className="divide-y divide-slate-100">
                    {visible.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        selected={task.id === selectedId}
                        onSelect={() => setSelectedId(task.id)}
                      />
                    ))}
                  </ul>

                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [group.key]: true }))}
                      className="w-full border-t border-slate-100 px-4 py-3 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      Показать ещё {hidden} {pluralTasks(hidden)}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="w-full shrink-0 xl:sticky xl:top-7 xl:w-[420px]">
        {selected ? (
          <TaskDetail
            task={selected}
            today={today}
            currentUserId={currentUserId}
            canManageAll={canManageAll}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
            Выберите задачу, чтобы увидеть контакты и адрес.
          </div>
        )}
      </div>
    </div>
  );
}
