/**
 * Работа с датами в формате YYYY-MM-DD — так их хранит Postgres (тип date).
 * Держим отдельно от запросов к БД: чистые функции можно тестировать без Supabase.
 */

function toISODate(date: Date): string {
  // Сдвигаем на локальный офсет перед срезкой: toISOString() переводит в UTC,
  // и вечером в Казахстане (UTC+5) вернул бы уже следующий день.
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Сегодняшняя дата по местному времени сотрудника. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function formatDateRu(value: string | null): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "—";
}

/** Время задачи: из БД приходит «14:30:00», человеку нужно «14:30». */
export function formatTimeRu(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS_RU = [
  "воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота",
];

/** «4 сентября, пятница» — заголовок группы задач одного дня. */
export function formatDateHeadingRu(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate()} ${MONTHS_RU[date.getMonth()]}, ${WEEKDAYS_RU[date.getDay()]}`;
}

/** «Суббота, 3 октября» — строка над заголовком экрана задач. */
export function formatFullDateRu(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  const weekday = WEEKDAYS_RU[date.getDay()];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
}

/**
 * «Сегодня» / «Завтра» / «4 октября» — короткая подпись дня рядом со
 * временем. Для соседних дней слово понятнее даты.
 */
export function formatDayLabelRu(value: string, today: string): string {
  if (value === today) return "Сегодня";
  if (value === addDaysISO(today, 1)) return "Завтра";
  if (value === addDaysISO(today, -1)) return "Вчера";

  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
}

/** Дата и время из timestamptz (например, комментарий) — «20.07.2026, 14:32». */
export function formatDateTimeRu(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString("ru-RU")}, ${date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
