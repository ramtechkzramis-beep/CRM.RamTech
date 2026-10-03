"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PERIOD_LABELS, shiftPeriod, type PeriodType } from "@/lib/periods";
import type { Employee } from "@/lib/summary-types";

export function SummaryFilters({
  period,
  anchor,
  assigneeId,
  employees,
  label,
}: {
  period: PeriodType;
  anchor: string;
  assigneeId: string;
  employees: Employee[];
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Фильтры держим в адресе страницы: так сводку можно переслать ссылкой
  // и она не сбрасывается при обновлении.
  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Смена периода/даты/сотрудника меняет число записей — номер страницы,
    // на которой стояли, может перестать существовать.
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/summary?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
        {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => update({ period: type })}
            className={`rounded-xl px-3.5 py-1.5 text-sm transition ${
              period === type
                ? "bg-slate-900 font-medium text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {PERIOD_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          aria-label="Предыдущий период"
          onClick={() => update({ date: shiftPeriod(period, anchor, -1) })}
          className="rounded-xl p-1.5 text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[9rem] px-2 text-center text-sm font-medium text-slate-900">
          {label}
        </span>
        <button
          type="button"
          aria-label="Следующий период"
          onClick={() => update({ date: shiftPeriod(period, anchor, 1) })}
          className="rounded-xl p-1.5 text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
        <span className="text-slate-500">Сотрудники</span>
        <select
          value={assigneeId}
          onChange={(e) => update({ assignee: e.target.value })}
          aria-label="Сотрудник"
          className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-slate-900 outline-none"
        >
          <option value="">Все</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
