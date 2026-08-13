"use client";

import { useTransition } from "react";
import { Eye } from "lucide-react";
import { setViewAsEmployee } from "@/app/(app)/today/actions";
import type { EmployeeWithDepartment } from "@/lib/admin";

/**
 * Переключатель «Смотреть как сотрудник» — только просмотр экрана «Задачи»
 * глазами другого человека, без действий от его имени. Рендерится в сайдбаре
 * только когда profile.can_view_as — персональное разрешение, не роль.
 */
export function ViewAsSwitcher({
  employees,
  currentUserId,
  activeEmployeeId,
}: {
  employees: EmployeeWithDepartment[];
  currentUserId: string;
  activeEmployeeId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const grouped = new Map<string, EmployeeWithDepartment[]>();
  for (const employee of employees) {
    if (employee.id === currentUserId || !employee.is_active) continue;
    const key = employee.department?.name ?? "Без отдела";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(employee);
  }

  function handleChange(value: string) {
    startTransition(() => {
      const formData = new FormData();
      formData.set("employee_id", value);
      setViewAsEmployee(formData);
    });
  }

  if (grouped.size === 0) return null;

  return (
    <div className="mb-3 px-2">
      <label className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <Eye className="size-3" />
        Смотреть как
      </label>
      <select
        value={activeEmployeeId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="w-full rounded-lg border border-sidebar-border bg-sidebar-hover px-2 py-1.5 text-xs text-white outline-none disabled:opacity-60"
      >
        <option value="">Свой экран</option>
        {[...grouped.entries()].map(([department, members]) => (
          <optgroup key={department} label={department}>
            {members.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
