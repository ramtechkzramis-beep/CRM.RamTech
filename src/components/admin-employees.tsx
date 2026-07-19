"use client";

import { useState, useTransition } from "react";
import { Plus, Copy, Check, KeyRound, Users } from "lucide-react";
import {
  createEmployee,
  resetEmployeePassword,
  updateEmployeeRole,
  updateEmployeeDepartment,
  toggleEmployeeActive,
  type CreateEmployeeState,
} from "@/app/(app)/admin/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import type { EmployeeWithDepartment } from "@/lib/admin";
import type { Department } from "@/lib/types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const ROLES: AppRole[] = ["admin", "head", "manager", "developer"];

/**
 * Экран одноразового пароля. Показывается один раз сразу после создания
 * или сброса — Supabase хранит только хэш, повторно узнать пароль нельзя,
 * поэтому уйти отсюда без копирования — значит завести пароль заново.
 */
function TempPasswordReveal({
  password,
  onClose,
}: {
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Скопируйте пароль и передайте сотруднику сейчас — повторно посмотреть
        его будет нельзя.
      </p>

      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
        <code className="flex-1 font-mono text-base tracking-wide text-slate-900">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
        >
          Готово
        </button>
      </div>
    </div>
  );
}

function AddEmployeeForm({
  departments,
  onClose,
}: {
  departments: Department[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result: CreateEmployeeState = await createEmployee(
        { error: null },
        formData,
      );
      if (result.error) setError(result.error);
      else if (result.tempPassword) {
        setError(null);
        setTempPassword(result.tempPassword);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Новый сотрудник
        </h3>

        {tempPassword ? (
          <TempPasswordReveal password={tempPassword} onClose={onClose} />
        ) : (
          <form action={handleAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
                Имя *
              </label>
              <input id="full_name" name="full_name" required className={FIELD_CLASS} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Рабочая почта *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="role" className="text-sm font-medium text-slate-700">
                  Роль *
                </label>
                <select id="role" name="role" defaultValue="manager" className={FIELD_CLASS}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="department_id" className="text-sm font-medium text-slate-700">
                  Отдел
                </label>
                <select id="department_id" name="department_id" className={FIELD_CLASS} defaultValue="">
                  <option value="">Без отдела</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Система создаст доступ и покажет временный пароль один раз —
              его нужно будет передать сотруднику самостоятельно.
            </p>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
              >
                {pending ? "Создаём…" : "Создать"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordButton({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("employee_id", employeeId);
      const result = await resetEmployeePassword({ error: null }, formData);
      if (result.error) setError(result.error);
      else if (result.tempPassword) setTempPassword(result.tempPassword);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
          setOpen(true);
        }}
        title="Сбросить пароль"
        className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <KeyRound className="size-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">
              Сбросить пароль
            </h3>

            {tempPassword ? (
              <TempPasswordReveal
                password={tempPassword}
                onClose={() => setOpen(false)}
              />
            ) : confirming ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Старый пароль перестанет действовать. Сотруднику нужно будет
                  войти с новым.
                </p>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={pending}
                    className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
                  >
                    {pending ? "Сбрасываем…" : "Сбросить"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function EmployeeRow({
  employee,
  departments,
  isSelf,
}: {
  employee: EmployeeWithDepartment;
  departments: Department[];
  isSelf: boolean;
}) {
  return (
    <tr className={employee.is_active ? "" : "opacity-50"}>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">
          {employee.full_name}
          {isSelf && <span className="ml-1.5 text-xs text-slate-400">(вы)</span>}
        </p>
        <p className="text-xs text-slate-500">{employee.email}</p>
      </td>

      <td className="px-4 py-3">
        <form action={updateEmployeeRole}>
          <input type="hidden" name="employee_id" value={employee.id} />
          <select
            name="role"
            defaultValue={employee.role}
            disabled={isSelf}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </form>
      </td>

      <td className="px-4 py-3">
        <form action={updateEmployeeDepartment}>
          <input type="hidden" name="employee_id" value={employee.id} />
          <select
            name="department_id"
            defaultValue={employee.department_id ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Без отдела</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </form>
      </td>

      <td className="px-4 py-3">
        <form action={toggleEmployeeActive}>
          <input type="hidden" name="employee_id" value={employee.id} />
          <input
            type="hidden"
            name="active"
            value={employee.is_active ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={isSelf && employee.is_active}
            title={
              isSelf && employee.is_active
                ? "Нельзя отключить самого себя"
                : employee.is_active
                  ? "Отключить доступ"
                  : "Включить доступ"
            }
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:cursor-not-allowed ${
              employee.is_active
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            {employee.is_active ? "Активен" : "Отключён"}
          </button>
        </form>
      </td>

      <td className="px-4 py-3 text-right">
        <ResetPasswordButton employeeId={employee.id} />
      </td>
    </tr>
  );
}

export function AdminEmployees({
  employees,
  departments,
  currentUserId,
}: {
  employees: EmployeeWithDepartment[];
  departments: Department[];
  currentUserId: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="size-4 text-slate-400" />
          Сотрудники
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {employees.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
        >
          <Plus className="size-3.5" />
          Сотрудник
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Сотрудник</th>
              <th className="px-4 py-2.5 font-medium">Роль</th>
              <th className="px-4 py-2.5 font-medium">Отдел</th>
              <th className="px-4 py-2.5 font-medium">Доступ</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                departments={departments}
                isSelf={employee.id === currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddEmployeeForm departments={departments} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}
