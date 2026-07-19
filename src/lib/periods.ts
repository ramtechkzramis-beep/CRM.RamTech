import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  format,
  parseISO,
} from "date-fns";

/** Периоды для сводки: день, неделя, месяц. */

export type PeriodType = "day" | "week" | "month";

export const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
};

export type PeriodRange = {
  /** Первый день периода, YYYY-MM-DD. */
  from: string;
  /** Последний день периода включительно, YYYY-MM-DD. */
  to: string;
  label: string;
};

// Два списка, потому что по-русски «16 июля», но «Июль 2026».
const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const MONTHS_NOMINATIVE = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function dayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

/**
 * Границы периода, в который попадает переданный день.
 * Неделя считается с понедельника — так принято в Казахстане, а не с воскресенья.
 */
export function periodRange(type: PeriodType, anchorISO: string): PeriodRange {
  const anchor = parseISO(anchorISO);

  if (type === "day") {
    return { from: anchorISO, to: anchorISO, label: dayMonth(anchor) };
  }

  if (type === "week") {
    const from = startOfWeek(anchor, { weekStartsOn: 1 });
    const to = endOfWeek(anchor, { weekStartsOn: 1 });
    return {
      from: iso(from),
      to: iso(to),
      label: `${dayMonth(from)} — ${dayMonth(to)}`,
    };
  }

  const from = startOfMonth(anchor);
  const to = endOfMonth(anchor);
  return {
    from: iso(from),
    to: iso(to),
    label: `${MONTHS_NOMINATIVE[anchor.getMonth()]} ${anchor.getFullYear()}`,
  };
}

/** Сдвиг на соседний период — для кнопок «назад» и «вперёд». */
export function shiftPeriod(
  type: PeriodType,
  anchorISO: string,
  direction: -1 | 1,
): string {
  const anchor = parseISO(anchorISO);

  if (type === "day") return iso(addDays(anchor, direction));
  if (type === "week") return iso(addWeeks(anchor, direction));
  return iso(addMonths(anchor, direction));
}
