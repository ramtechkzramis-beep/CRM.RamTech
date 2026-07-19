"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDaysISO } from "@/lib/dates";

const WEEKDAYS = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Листалка по дням: посмотреть, что было вчера и что запланировано вперёд. */
export function DayNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const current = new Date(`${date}T00:00:00`);
  const isToday = date === today;

  function go(value: string) {
    // Сегодняшний день держим на чистом адресе — это домашний экран.
    router.push(value === today ? "/today" : `/today?date=${value}`);
  }

  const label = isToday
    ? "Сегодня"
    : `${current.getDate()} ${MONTHS[current.getMonth()]}, ${WEEKDAYS[current.getDay()]}`;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
        <button
          type="button"
          aria-label="Предыдущий день"
          onClick={() => go(addDaysISO(date, -1))}
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="min-w-[11rem] px-2 text-center text-sm font-medium text-slate-900">
          {label}
        </span>

        <button
          type="button"
          aria-label="Следующий день"
          onClick={() => go(addDaysISO(date, 1))}
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {!isToday && (
        <button
          type="button"
          onClick={() => go(today)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <CalendarDays className="size-3.5" />
          К сегодня
        </button>
      )}
    </div>
  );
}
