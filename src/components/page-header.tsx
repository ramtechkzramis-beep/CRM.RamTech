export function PageHeader({
  title,
  eyebrow,
  count,
  subtitle,
  action,
}: {
  title: string;
  /** Мелкая строка над заголовком: «Потенциальные клиенты», «Действия всех сотрудников». */
  eyebrow?: string;
  /** Число рядом с заголовком — размер списка. */
  count?: number | string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm text-slate-500">{eyebrow}</p>}
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[32px] font-bold leading-none tracking-tight text-slate-900">
            {title}
          </h1>
          {count !== undefined && (
            <span className="text-xl font-semibold text-slate-400">
              {typeof count === "number"
                ? new Intl.NumberFormat("ru-RU").format(count)
                : count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
