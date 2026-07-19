import { differenceInMonths, parseISO } from "date-fns";

/** Срок договора по умолчанию, если у клиента не указан иной. */
export const DEFAULT_CONTRACT_MONTHS = 6;

export const SEGMENTS = ["ППС1", "ППС2", "ППС3", "ППС4", "overdue"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  ППС1: "ППС1",
  ППС2: "ППС2",
  ППС3: "ППС3",
  ППС4: "ППС4",
  overdue: "Просрочка продления",
};

/**
 * Описание сегмента зависит от срока договора: у клиента на 12 месяцев
 * ППС3 — это 11-й месяц, а не 5-й.
 */
export function segmentDescription(
  segment: Segment,
  contractMonths: number = DEFAULT_CONTRACT_MONTHS,
): string {
  switch (segment) {
    case "ППС1":
      return "1-й месяц работы";
    case "ППС2":
      return contractMonths <= 3
        ? "середина договора"
        : `2–${contractMonths - 2}-й месяц работы`;
    case "ППС3":
      return `${contractMonths - 1}-й месяц, подходит к продлению`;
    case "ППС4":
      return `${contractMonths}-й месяц, последний перед продлением`;
    case "overdue":
      return "Срок договора закончился, продления нет";
  }
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/**
 * Номер месяца работы в текущем цикле: в первый месяц — 1.
 * Зеркалит month_in_cycle() в БД — держать синхронно.
 *
 * Именно differenceInMonths, а не differenceInCalendarMonths: в БД считает age(),
 * который даёт полные месяцы. С календарной версией клиент, начавший 15 января,
 * 10 февраля показывался бы как ППС2 в интерфейсе и ППС1 в базе.
 */
export function monthInCycle(
  cycleStartDate: string | Date | null,
  today: Date = new Date(),
): number | null {
  if (!cycleStartDate) return null;

  const start = toDate(cycleStartDate);
  if (start > today) return null;

  return differenceInMonths(today, start) + 1;
}

/**
 * Сегмент по месяцу работы и сроку договора. Зеркалит segment_for_month() в БД.
 *
 * ППС1 — первый месяц, ППС4 — последний, ППС3 — предпоследний, ППС2 — всё между.
 * Сегменты тянутся под срок: на 6 месяцах это привычные 1 / 2-4 / 5 / 6,
 * на 12 — 1 / 2-10 / 11 / 12.
 */
export function segmentForMonth(
  month: number | null,
  contractMonths: number = DEFAULT_CONTRACT_MONTHS,
): Segment | null {
  if (month === null) return null;
  if (month > contractMonths) return "overdue";
  if (month <= 1) return "ППС1";
  if (month === contractMonths) return "ППС4";
  if (month === contractMonths - 1) return "ППС3";
  return "ППС2";
}

export function segmentFor(
  cycleStartDate: string | Date | null,
  today: Date = new Date(),
  contractMonths: number = DEFAULT_CONTRACT_MONTHS,
): Segment | null {
  return segmentForMonth(monthInCycle(cycleStartDate, today), contractMonths);
}

export const SEGMENT_STYLES: Record<Segment, string> = {
  ППС1: "bg-sky-100 text-sky-800",
  ППС2: "bg-slate-100 text-slate-700",
  ППС3: "bg-amber-100 text-amber-800",
  ППС4: "bg-orange-100 text-orange-900",
  overdue: "bg-red-100 text-red-800",
};
