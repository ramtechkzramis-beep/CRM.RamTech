"use client";

import { useState, useTransition } from "react";
import { UserCog, ArrowRight } from "lucide-react";
import { reassignClient } from "@/app/(app)/clients/actions";
import type { Employee } from "@/lib/summary-types";

/**
 * Передача клиента другому сотруднику. Показывается только руководителю —
 * у остальных ответственный виден, но не редактируется.
 */
export function ClientOwner({
  clientId,
  ownerId,
  ownerName,
  employees,
}: {
  clientId: string;
  ownerId: string;
  ownerName: string | null;
  employees: Employee[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(ownerId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await reassignClient({ error: null }, formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  const target = employees.find((e) => e.id === selected);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSelected(ownerId);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <UserCog className="size-3.5" />
        Передать
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Передать клиента
            </h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">
              Клиент перейдёт вместе с задачами и историей
            </p>

            <form action={handleAction} className="space-y-4">
              <input type="hidden" name="client_id" value={clientId} />

              <div className="space-y-1.5">
                <label
                  htmlFor="owner_id"
                  className="text-sm font-medium text-slate-700"
                >
                  Новый ответственный
                </label>
                <select
                  id="owner_id"
                  name="owner_id"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {selected !== ownerId && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">
                    {ownerName ?? "Без ответственного"}
                  </span>
                  <ArrowRight className="size-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {target?.full_name}
                  </span>
                </p>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={pending || selected === ownerId}
                  className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
                >
                  {pending ? "Передаём…" : "Передать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
