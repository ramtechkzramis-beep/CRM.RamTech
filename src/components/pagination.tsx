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

  const linkClass =
    "flex size-8 items-center justify-center rounded-lg text-sm transition";
  const activeClass = "bg-gradient-to-r from-brand to-brand-dark font-medium text-white";
  const inactiveClass = "text-slate-600 hover:bg-slate-100";
  const disabledClass = "pointer-events-none text-slate-300";

  return (
    <nav
      aria-label="Страницы"
      className="mt-4 flex items-center justify-center gap-1"
    >
      <Link
        href={hrefFor(page - 1)}
        aria-label="Предыдущая страница"
        className={`${linkClass} ${page <= 1 ? disabledClass : inactiveClass}`}
      >
        <ChevronLeft className="size-4" />
      </Link>

      {pageNumbers(page, totalPages).map((item, index) =>
        item === "…" ? (
          <span key={`ellipsis-${index}`} className="flex size-8 items-center justify-center text-sm text-slate-400">
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
        className={`${linkClass} ${page >= totalPages ? disabledClass : inactiveClass}`}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
