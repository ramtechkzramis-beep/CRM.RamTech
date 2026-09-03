"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateTask } from "@/app/(app)/today/actions";
import { TASK_TYPES, TASK_TYPE_LABELS, type TaskWithRelations } from "@/lib/task-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

/**
 * Правка уже созданной задачи — тип, детали, дата/время, приоритет, адрес.
 * Контакт и исполнитель тут не меняются: это отдельные, более редкие
 * действия (для контакта — пересоздать задачу, для исполнителя — «Передать»
 * клиента целиком, что переносит и его открытые задачи).
 */
export function EditTaskForm({ task }: { task: TaskWithRelations }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await updateTask({ error: null }, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label="Редактировать задачу"
        title="Редактировать задачу"
        className="rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <Pencil className="size-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Редактировать задачу
            </h2>

            <form action={handleAction} className="space-y-4">
              <input type="hidden" name="task_id" value={task.id} />

              <div className="space-y-1.5">
                <label htmlFor={`edit-type-${task.id}`} className="text-sm font-medium text-slate-700">
                  Тип задачи *
                </label>
                <select
                  id={`edit-type-${task.id}`}
                  name="type"
                  defaultValue={task.type}
                  className={FIELD_CLASS}
                >
                  {TASK_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {TASK_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`edit-description-${task.id}`}
                  className="text-sm font-medium text-slate-700"
                >
                  Подробности
                </label>
                <textarea
                  id={`edit-description-${task.id}`}
                  name="description"
                  rows={2}
                  defaultValue={task.description ?? ""}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`edit-location-${task.id}`}
                  className="text-sm font-medium text-slate-700"
                >
                  Адрес
                </label>
                <input
                  id={`edit-location-${task.id}`}
                  name="location"
                  defaultValue={task.location ?? ""}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor={`edit-due-date-${task.id}`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Дата *
                  </label>
                  <input
                    id={`edit-due-date-${task.id}`}
                    name="due_date"
                    type="date"
                    required
                    defaultValue={task.due_date}
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`edit-due-time-${task.id}`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Время
                  </label>
                  <input
                    id={`edit-due-time-${task.id}`}
                    name="due_time"
                    type="time"
                    defaultValue={task.due_time?.slice(0, 5) ?? ""}
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor={`edit-priority-${task.id}`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Приоритет
                  </label>
                  <select
                    id={`edit-priority-${task.id}`}
                    name="priority"
                    defaultValue={task.priority}
                    className={FIELD_CLASS}
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
                  {pending ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
