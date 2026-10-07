import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Номера страниц с многоточием: 1 … 4 5 6 … 21, а не все 21 подряд. */
function pageNumbers(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const items: (number | "…")[] = [1];
  if (left > 2) items.push("…");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("…");
  if (total > 1) items.push(total);

  return items;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  /** Текущие фильтры/сортировка — переносятся на каждую страницу. */
  searchParams: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams(searchParams);
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const linkClass = "flex size-9 items-center justify-center rounded-xl text-sm transition";
  const activeClass = "bg-slate-900 font-semibold text-white";
  const inactiveClass = "text-slate-600 hover:bg-slate-100";
  const arrowClass = "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  const disabledClass = "pointer-events-none border border-slate-100 text-slate-300";

  // Номера по центру, а не в правом углу: там они упираются в кнопку чата.
  // Подпись слева, третья колонка пустая — она и держит центр.
  return (
    <nav
      aria-label="Страницы"
      className="mt-4 flex flex-col items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr]"
    >
      {/* Номер страницы словами — в длинном списке цифр пагинации легко
          потерять, на какой ты сейчас. */}
      <span className="text-sm text-slate-500 sm:justify-self-start">
        Страница {page} из {totalPages}
      </span>

      <div className="flex items-center gap-1">
        <Link
          href={hrefFor(page - 1)}
          aria-label="Предыдущая страница"
          className={`${linkClass} ${page <= 1 ? disabledClass : arrowClass}`}
        >
          <ChevronLeft className="size-4" />
        </Link>

        {pageNumbers(page, totalPages).map((item, index) =>
          item === "…" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex size-9 items-center justify-center text-sm text-slate-400"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              aria-current={item === page ? "page" : undefined}
              className={`${linkClass} ${item === page ? activeClass : inactiveClass}`}
            >
              {item}
            </Link>
          ),
        )}

        <Link
          href={hrefFor(page + 1)}
          aria-label="Следующая страница"
          className={`${linkClass} ${page >= totalPages ? disabledClass : arrowClass}`}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <span className="hidden sm:block" />
    </nav>
  );
}
