import Link from "next/link";
import { SEGMENTS, SEGMENT_LABELS, type Segment } from "@/lib/segments";

export function SegmentTabs({
  counts,
  total,
  current,
}: {
  counts: Record<Segment, number>;
  total: number;
  current: Segment | null;
}) {
  const tabs: { key: Segment | null; label: string; count: number }[] = [
    { key: null, label: "Все", count: total },
    ...SEGMENTS.map((segment) => ({
      key: segment,
      label: SEGMENT_LABELS[segment],
      count: counts[segment],
    })),
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = current === tab.key;
        const href = tab.key ? `/clients/active?segment=${tab.key}` : "/clients/active";

        return (
          <Link
            key={tab.key ?? "all"}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
              isActive
                ? "border-brand bg-gradient-to-r from-brand to-brand-dark text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
