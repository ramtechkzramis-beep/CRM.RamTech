"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/app/(app)/today/actions";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/task-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export type ClientOption = { id: string; name: string };
export type AssigneeOption = { id: string; full_name: string };

export function AddTaskForm({
  clients,
  assignees,
  defaultClientId,
  defaultDueDate,
  label = "Добавить задачу",
}: {
  clients: ClientOption[];
  assignees?: AssigneeOption[];
  defaultClientId?: string;
  defaultDueDate: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            <select id="type" name="type" className={FIELD_CLASS} defaultValue="call">
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TASK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Что нужно сделать *
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="Например: уточнить бюджет на следующий квартал"
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Подробности
            </label>
            <textarea id="description" name="description" rows={2} className={FIELD_CLASS} />
          </div>

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
              <select id="assignee_id" name="assignee_id" className={FIELD_CLASS} defaultValue="">
                <option value="">Я</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
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
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
