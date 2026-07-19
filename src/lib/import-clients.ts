import type { BusinessSize, ContactRole } from "@/lib/client-types";

/**
 * Разбор таблицы с клиентами.
 *
 * Работает с уже прочитанными строками, а не с файлом: логику можно проверить
 * тестами без Excel и без базы.
 *
 * Две вещи, ради которых это устроено сложнее наивного «строка = клиент»:
 * 1. Колонки определяются по заголовкам, а не по порядку — у людей свои таблицы,
 *    заставлять их перекладывать данные в наш шаблон бессмысленно.
 * 2. Несколько строк с одной фирмой — это несколько контактов одной фирмы,
 *    а не дубли. Наивная логика выбросила бы половину контактов.
 */

export type ParsedContact = {
  full_name: string;
  role: ContactRole | null;
  position: string | null;
  phone: string | null;
  email: string | null;
};

export type ParsedClient = {
  name: string;
  city: string | null;
  business_size: BusinessSize | null;
  source: string | null;
  notes: string | null;
  contacts: ParsedContact[];
};

export type RowError = { row: number; message: string };

export type ParseResult = {
  clients: ParsedClient[];
  errors: RowError[];
};

export const TEMPLATE_HEADERS = [
  "Компания",
  "Город",
  "Имя",
  "Роль",
  "Должность",
  "Телефон",
  "Почта",
  "Размер бизнеса",
  "Источник",
  "Заметки",
] as const;

type FieldKey =
  | "name"
  | "city"
  | "contact_name"
  | "role"
  | "position"
  | "phone"
  | "email"
  | "contact_data"
  | "business_size"
  | "source"
  | "notes";

// Синонимы заголовков. Люди называют колонки как угодно, поэтому узнаём
// по вхождению подстроки: «Город куратора» → город, «Фирмы» → компания.
const HEADER_SYNONYMS: { key: FieldKey; match: string[] }[] = [
  { key: "name", match: ["компания", "фирма", "фирмы", "организация", "клиент", "название"] },
  { key: "city", match: ["город"] },
  { key: "contact_name", match: ["имя", "контактное лицо", "контакт", "фио"] },
  { key: "role", match: ["роль"] },
  { key: "position", match: ["должность"] },
  { key: "phone", match: ["телефон", "тел.", "моб"] },
  { key: "email", match: ["почта", "email", "e-mail", "мейл"] },
  { key: "contact_data", match: ["данные", "контактные данные"] },
  { key: "business_size", match: ["размер"] },
  { key: "source", match: ["источник"] },
  { key: "notes", match: ["заметки", "примечание", "комментарий"] },
];

const BUSINESS_SIZE_MAP: Record<string, BusinessSize> = {
  малый: "small",
  мелкий: "small",
  small: "small",
  средний: "medium",
  medium: "medium",
  крупный: "large",
  большой: "large",
  large: "large",
};

const ROLE_MAP: { role: ContactRole; match: string[] }[] = [
  { role: "decision_maker", match: ["принимает"] },
  { role: "influencer", match: ["влияет"] },
  { role: "employee", match: ["сотрудник"] },
];

function cell(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  // ExcelJS и SheetJS отдают формулы, ссылки и даты объектами.
  if (typeof value === "object") {
    const obj = value as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof obj.text === "string") return cell(obj.text);
    if (obj.result !== undefined) return cell(obj.result);
    return null;
  }

  // Переносы строк внутри ячейки схлопываем: в выгрузках их ставят для верстки.
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

export function parseBusinessSize(value: unknown): BusinessSize | null {
  const text = cell(value);
  if (!text) return null;
  return BUSINESS_SIZE_MAP[text.toLowerCase()] ?? null;
}

export function parseRole(value: unknown): ContactRole | null {
  const text = cell(value)?.toLowerCase();
  if (!text) return null;

  const found = ROLE_MAP.find((item) =>
    item.match.some((needle) => text.includes(needle)),
  );
  return found?.role ?? null;
}

/** Похоже на почту — значит почта. Иначе считаем телефоном. */
export function looksLikeEmail(value: string): boolean {
  return /.+@.+\..+/.test(value);
}

/**
 * Сопоставляет заголовки файла с полями CRM.
 * Возвращает карту «поле → номер колонки».
 */
export function mapHeaders(headerRow: unknown[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};

  headerRow.forEach((raw, index) => {
    const header = cell(raw)?.toLowerCase();
    if (!header) return;

    for (const { key, match } of HEADER_SYNONYMS) {
      if (map[key] !== undefined) continue;
      if (match.some((needle) => header.includes(needle))) {
        map[key] = index;
        return;
      }
    }
  });

  return map;
}

function valueAt(
  row: unknown[],
  map: Partial<Record<FieldKey, number>>,
  key: FieldKey,
): string | null {
  const index = map[key];
  return index === undefined ? null : cell(row[index]);
}

/**
 * Превращает строки таблицы в клиентов с контактами.
 * Строки с одинаковым названием фирмы объединяются в одного клиента.
 */
export function parseClientRows(
  headerRow: unknown[],
  rows: unknown[][],
  rowOffset = 2,
): ParseResult {
  const map = mapHeaders(headerRow);
  const errors: RowError[] = [];

  if (map.name === undefined) {
    return {
      clients: [],
      errors: [
        {
          row: 1,
          message:
            "Не нашёл колонку с названием компании. Назовите её «Компания» или «Фирмы».",
        },
      ],
    };
  }

  const byName = new Map<string, ParsedClient>();

  rows.forEach((row, index) => {
    const rowNumber = index + rowOffset;

    if (row.every((c) => cell(c) === null)) return;

    const name = valueAt(row, map, "name");
    if (!name) {
      errors.push({ row: rowNumber, message: "Не указана компания — строка пропущена" });
      return;
    }

    const key = name.toLowerCase();
    let client = byName.get(key);

    if (!client) {
      client = {
        name,
        city: valueAt(row, map, "city"),
        business_size: parseBusinessSize(valueAt(row, map, "business_size")),
        source: valueAt(row, map, "source"),
        notes: valueAt(row, map, "notes"),
        contacts: [],
      };
      byName.set(key, client);
    }

    let phone = valueAt(row, map, "phone");
    let email = valueAt(row, map, "email");

    // Колонка «Данные» в реальных выгрузках содержит то телефон, то почту.
    const contactData = valueAt(row, map, "contact_data");
    if (contactData) {
      if (looksLikeEmail(contactData)) {
        email = email ?? contactData;
      } else {
        phone = phone ?? contactData;
      }
    }

    const contactName = valueAt(row, map, "contact_name");

    // Строка без человека, но с фирмой — это просто фирма без контактов.
    if (!contactName && !phone && !email) return;

    client.contacts.push({
      full_name: contactName ?? "Без имени",
      role: parseRole(valueAt(row, map, "role")),
      position: valueAt(row, map, "position"),
      phone,
      email,
    });
  });

  return { clients: [...byName.values()], errors };
}
