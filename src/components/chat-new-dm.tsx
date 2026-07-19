"use client";

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import type { DirectoryEmployee } from "@/lib/chat-types";
import { ROLE_LABELS } from "@/lib/types";

export function ChatNewDm({
  employees,
  onBack,
  onSelect,
}: {
  employees: DirectoryEmployee[];
  onBack: () => void;
  onSelect: (employeeId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900">Новое сообщение</span>
      </div>

      <div className="border-b border-slate-100 p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Кому написать"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">Никого не нашлось.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((employee) => (
              <li key={employee.id}>
                <button
                  type="button"
                  onClick={() => onSelect(employee.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-semibold text-white">
                    {employee.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {employee.full_name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {ROLE_LABELS[employee.role]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
