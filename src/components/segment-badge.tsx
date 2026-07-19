import type { Segment } from "@/lib/segments";
import { SEGMENT_LABELS, SEGMENT_STYLES } from "@/lib/segments";

export function SegmentBadge({ segment }: { segment: Segment | null }) {
  if (!segment) return <span className="text-slate-400">—</span>;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEGMENT_STYLES[segment]}`}
    >
      {SEGMENT_LABELS[segment]}
    </span>
  );
}
