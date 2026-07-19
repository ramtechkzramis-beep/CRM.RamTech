"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Employee } from "@/lib/summary-types";
import type { ClientSort } from "@/lib/client-types";
import { formatDateRu } from "@/lib/dates";

/** Сортировки холодной базы. Продлений тут нет, поэтому свой набор. */
const SORT_LABELS: Partial<Record<ClientSort, string>> = {
  created: "Сначала новые",
  created_asc: "Сначала старые",
  name: "По названию",
};

export function ColdFilters({
  employees,
  cities,
  dates,
  query,
  ownerId,
  city,
  addedDate,
  sort,
}: {
  employees: Employee[];
  cities: string[];
  dates: string[];
  query: string;
  ownerId: string;
  city: string;
  addedDate: string;
  sort: ClientSort;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [text, setText] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);

  // Синхронизируем поле с адресом при рендере: эффект здесь гонял бы
  // лишние рендеры, а после сброса в поле оставался бы старый текст.
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }

  function buildHref(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Смена фильтра или сортировки меняет общее число результатов —
    // номер страницы, на которой стояли, может перестать существовать.
    params.delete("page");

    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const search = params.toString();
    return search ? `/clients/cold?${search}` : "/clients/cold";
  }

  // Ждём паузы в наборе: иначе запрос уходит на каждую букву.
  useEffect(() => {
    if (text === query) return;

    const timer = setTimeout(() => {
      router.replace(buildHref({ q: text }), { scroll: false });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Поиск компании"
          aria-label="Поиск компании"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label="Очистить поиск"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {cities.length > 0 && (
        <select
          value={city}
          onChange={(e) => router.push(buildHref({ city: e.target.value }))}
          aria-label="Город"
          className={selectClass}
        >
          <option value="">Все города</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}

      <select
        value={ownerId}
        onChange={(e) => router.push(buildHref({ owner: e.target.value }))}
        aria-label="Ответственный"
        className={selectClass}
      >
        <option value="">Все ответственные</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ))}
      </select>

      {dates.length > 1 && (
        // Список реальных дней загрузки, а не календарь: базу пополняют
        // редко и пачками, тыкать в пустые даты бессмысленно.
        <select
          value={addedDate}
          onChange={(e) => router.push(buildHref({ added: e.target.value }))}
          aria-label="День добавления"
          className={selectClass}
        >
          <option value="">Любой день добавления</option>
          {dates.map((day) => (
            <option key={day} value={day}>
              {formatDateRu(day)}
            </option>
          ))}
        </select>
      )}

      <select
        value={sort}
        onChange={(e) => router.push(buildHref({ sort: e.target.value }))}
        aria-label="Сортировка"
        className={selectClass}
      >
        {(Object.keys(SORT_LABELS) as ClientSort[]).map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
