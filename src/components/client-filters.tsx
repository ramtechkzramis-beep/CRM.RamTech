"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import type { Employee } from "@/lib/summary-types";
import { CLIENT_SORT_LABELS, type ClientSort } from "@/lib/client-types";

export function ClientFilters({
  employees,
  query,
  ownerId,
  sort,
}: {
  employees: Employee[];
  query: string;
  ownerId: string;
  sort: ClientSort;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [text, setText] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);

  // Поле синхронизируем с адресом прямо при рендере, а не эффектом: иначе
  // после «сбросить» в нём остаётся старый текст, а эффект гоняет лишний рендер.
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }

  function buildHref(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const search = params.toString();
    return search ? `/clients/active?${search}` : "/clients/active";
  }

  // Ждём паузы в наборе: без этого запрос уходил бы на каждую букву.
  useEffect(() => {
    if (text === query) return;

    const timer = setTimeout(() => {
      router.replace(buildHref({ q: text }), { scroll: false });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Компания, контакт, телефон или город"
          aria-label="Поиск клиентов"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label="Очистить поиск"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
        <span className="text-slate-500">Куратор</span>
        <select
          value={ownerId}
          onChange={(e) => router.push(buildHref({ owner: e.target.value }))}
          aria-label="Куратор"
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

      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
        <ArrowDownWideNarrow className="size-4 text-slate-400" />
        <select
          value={sort}
          onChange={(e) => router.push(buildHref({ sort: e.target.value }))}
          aria-label="Сортировка"
          className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-slate-900 outline-none"
        >
          {(Object.keys(CLIENT_SORT_LABELS) as ClientSort[]).map((key) => (
            <option key={key} value={key}>
              {CLIENT_SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
