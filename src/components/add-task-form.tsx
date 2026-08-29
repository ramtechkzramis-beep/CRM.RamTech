"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/app/(app)/today/actions";
import {
  OUTCOMES_BY_TYPE,
  OUTCOME_LABELS,
  OUTCOME_TONE,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  type TaskType,
} from "@/lib/task-types";

const TONE_ACTIVE: Record<"good" | "bad" | "neutral", string> = {
  good: "border-emerald-600 bg-emerald-600 text-white",
  bad: "border-red-600 bg-red-600 text-white",
  neutral: "border-brand bg-gradient-to-r from-brand to-brand-dark text-white",
};

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const NEW_CONTACT_VALUE = "__new__";

export type ClientOption = { id: string; name: string };
export type AssigneeOption = { id: string; full_name: string };
export type ContactOption = { id: string; full_name: string; phone?: string | null };

export function AddTaskForm({
  clients,
  assignees,
  contacts,
  defaultAddress,
  defaultClientId,
  defaultAssigneeId,
  defaultDueDate,
  label = "Добавить задачу",
}: {
  clients: ClientOption[];
  assignees?: AssigneeOption[];
  /** Контакты клиента — есть только когда форма открыта с его карточки. */
  contacts?: ContactOption[];
  /** Адрес из карточки клиента — подставляется в поле встречи, но его можно поправить. */
  defaultAddress?: string | null;
  defaultClientId?: string;
  /** Кому по умолчанию ставится задача — например, при просмотре чужого дня. */
  defaultAssigneeId?: string;
  defaultDueDate: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<TaskType>("call");
  const [contactId, setContactId] = useState("");
  const [completing, setCompleting] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [pending, startTransition] = useTransition();

  // Форму закрываем прямо в обработчике, а не в useEffect по результату:
  // эффект, дёргающий setState, гоняет лишние рендеры.
  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await createTask({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setType("call");
          setContactId("");
          setCompleting(false);
          setOutcome("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
      >
        <Plus className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Новая задача</h2>

        <form action={handleAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="type" className="text-sm font-medium text-slate-700">
              Тип задачи *
            </label>
            <select
              id="type"
              name="type"
              className={FIELD_CLASS}
              value={type}
              onChange={(e) => {
                setType(e.target.value as TaskType);
                setOutcome("");
              }}
            >
              {TASK_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TASK_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Подробности
            </label>
            <textarea id="description" name="description" rows={2} className={FIELD_CLASS} />
          </div>

          {/* Контакт и адрес — только когда форма открыта с карточки клиента:
              без выбранного клиента неоткуда взять список контактов. */}
          {contacts && (
            <div className="space-y-1.5">
              <label htmlFor="contact_id" className="text-sm font-medium text-slate-700">
                {type === "call" ? "С кем звонок" : "С кем встреча"}
              </label>
              <select
                id="contact_id"
                name="contact_id"
                className={FIELD_CLASS}
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">Не указано</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                    {contact.phone ? ` · ${contact.phone}` : ""}
                  </option>
                ))}
                <option value={NEW_CONTACT_VALUE}>+ Новый контакт</option>
              </select>

              {contactId === NEW_CONTACT_VALUE && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <input
                    name="new_contact_name"
                    placeholder="Имя *"
                    required
                    className={FIELD_CLASS}
                  />
                  <input
                    name="new_contact_phone"
                    placeholder="Телефон"
                    className={FIELD_CLASS}
                  />
                </div>
              )}
            </div>
          )}

          {contacts && type !== "call" && (
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-medium text-slate-700">
                Адрес встречи
              </label>
              <input
                id="location"
                name="location"
                defaultValue={defaultAddress ?? ""}
                placeholder="Адрес — можно поправить"
                className={FIELD_CLASS}
              />
            </div>
          )}

          {defaultClientId ? (
            <input type="hidden" name="client_id" value={defaultClientId} />
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="client_id" className="text-sm font-medium text-slate-700">
                Клиент
              </label>
              <select id="client_id" name="client_id" className={FIELD_CLASS} defaultValue="">
                <option value="">Без клиента</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="due_date" className="text-sm font-medium text-slate-700">
                Дата *
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                required
                defaultValue={defaultDueDate}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="due_time" className="text-sm font-medium text-slate-700">
                Время
              </label>
              {/* Не обязательно: «позвонить сегодня» — нормальная задача без часа. */}
              <input id="due_time" name="due_time" type="time" className={FIELD_CLASS} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-sm font-medium text-slate-700">
                Приоритет
              </label>
              <select id="priority" name="priority" className={FIELD_CLASS} defaultValue="normal">
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>

          {assignees && assignees.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="assignee_id" className="text-sm font-medium text-slate-700">
                Исполнитель
              </label>
              <select
                id="assignee_id"
                name="assignee_id"
                className={FIELD_CLASS}
                defaultValue={defaultAssigneeId ?? ""}
              >
                <option value="">Я</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* «Завершить» открывает выбор результата — для задач, которые уже
              случились (например, звонок был вчера, и его нужно просто
              зафиксировать закрытым, а не ставить в план). */}
          {completing && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">Чем закончилось?</p>

              <input type="hidden" name="outcome" value={outcome} />
              <div className="flex flex-wrap gap-2">
                {OUTCOMES_BY_TYPE[type].map((item) => {
                  const isActive = outcome === item;
                  const tone = OUTCOME_TONE[item];

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setOutcome(item)}
                      aria-pressed={isActive}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        isActive
                          ? TONE_ACTIVE[tone]
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {OUTCOME_LABELS[item]}
                    </button>
                  );
                })}
              </div>

              <textarea
                name="outcome_note"
                rows={2}
                placeholder="Комментарий — что обсудили, о чём договорились"
                className={FIELD_CLASS}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Отменить
            </button>
            <button
              type={completing ? "submit" : "button"}
              name="action"
              value="complete"
              onClick={() => {
                if (!completing) setCompleting(true);
              }}
              disabled={completing && (pending || !outcome)}
              className="rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-soft disabled:opacity-60"
            >
              {completing && pending ? "Завершаем…" : "Завершить"}
            </button>
            <button
              type="submit"
              name="action"
              value="save"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {!completing && pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
