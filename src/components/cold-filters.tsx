"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import type { Employee } from "@/lib/summary-types";
import type { ClientSort } from "@/lib/client-types";

/** Сортировки холодной базы. Продлений тут нет, поэтому свой набор. */
const SORT_LABELS: Partial<Record<ClientSort, string>> = {
  created: "Сначала новые",
  created_asc: "Сначала старые",
  name: "По названию",
  activity: "По последнему действию",
};

/**
 * Фильтр-таблетка: подпись слева, выбранное значение — тем же полем.
 * Нативный select оставляем (доступность и работа с клавиатуры), прячем
 * только его стрелку.
 */
function FilterPill({
  label,
  icon,
  children,
}: {
  label?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
      {icon}
      {label && <span className="text-slate-500">{label}</span>}
      {children}
    </div>
  );
}

const SELECT_CLASS =
  "cursor-pointer appearance-none bg-transparent pr-1 font-medium text-slate-900 outline-none";

export function ColdFilters({
  employees,
  cities,
  query,
  ownerId,
  city,
  sort,
  basePath = "/clients/cold",
}: {
  employees: Employee[];
  cities: string[];
  query: string;
  ownerId: string;
  city: string;
  sort: ClientSort;
  /** Наработки используют тот же фильтр, но со своим адресом страницы. */
  basePath?: string;
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
    return search ? `${basePath}?${search}` : basePath;
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

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[260px] flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Компания, телефон или ЛПР"
          aria-label="Поиск компании"
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

      {cities.length > 0 && (
        <FilterPill label="Город">
          <select
            value={city}
            onChange={(e) => router.push(buildHref({ city: e.target.value }))}
            aria-label="Город"
            className={SELECT_CLASS}
          >
            <option value="">Все</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterPill>
      )}

      <FilterPill label="Ответственный">
        <select
          value={ownerId}
          onChange={(e) => router.push(buildHref({ owner: e.target.value }))}
          aria-label="Ответственный"
          className={SELECT_CLASS}
        >
          <option value="">Все</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
      </FilterPill>

      <FilterPill icon={<ArrowDownWideNarrow className="size-4 text-slate-400" />}>
        <select
          value={sort}
          onChange={(e) => router.push(buildHref({ sort: e.target.value }))}
          aria-label="Сортировка"
          className={SELECT_CLASS}
        >
          {(Object.keys(SORT_LABELS) as ClientSort[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </FilterPill>
    </div>
  );
}
