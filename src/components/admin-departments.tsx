"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import {
  createDepartment,
  renameDepartment,
  deleteDepartment,
} from "@/app/(app)/admin/actions";
import type { Department } from "@/lib/types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function AddDepartmentForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await createDepartment({ error: null }, formData);
      if (result.error) setError(result.error);
      else {
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Plus className="size-3.5" />
        Отдел
      </button>
    );
  }

  return (
    <form action={handleAction} className="flex items-center gap-2">
      <input
        name="name"
        autoFocus
        placeholder="Название отдела"
        className={FIELD_CLASS}
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
      >
        {pending ? "…" : "Добавить"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
      >
        Отмена
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

function DepartmentRow({
  department,
  usage,
}: {
  department: Department;
  usage: { employees: number; clients: number };
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRename(formData: FormData) {
    startTransition(async () => {
      const result = await renameDepartment({ error: null }, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <form action={handleRename} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="department_id" value={department.id} />
          <input
            name="name"
            defaultValue={department.name}
            autoFocus
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Отмена
          </button>
        </form>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex-1 text-sm text-slate-900">{department.name}</span>
      <span className="text-xs text-slate-400">
        {usage.employees} сотр. · {usage.clients} клиент.
      </span>

      {!confirming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Переименовать ${department.name}`}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Удалить ${department.name}`}
            className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
      ) : (
        <form action={deleteDepartment} className="flex items-center gap-1.5">
          <input type="hidden" name="department_id" value={department.id} />
          <span className="text-xs text-slate-500">
            {usage.employees > 0
              ? `Сотрудники останутся без отдела. Удалить?`
              : "Удалить?"}
          </span>
          <button
            type="submit"
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700"
          >
            Да
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
          >
            Нет
          </button>
        </form>
      )}
    </li>
  );
}

export function AdminDepartments({
  departments,
  usage,
}: {
  departments: Department[];
  usage: Record<string, { employees: number; clients: number }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Building2 className="size-4 text-slate-400" />
          Отделы
        </h2>
        <AddDepartmentForm />
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-slate-500">Отделов пока нет.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {departments.map((dept) => (
            <DepartmentRow
              key={dept.id}
              department={dept}
              usage={usage[dept.id] ?? { employees: 0, clients: 0 }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
