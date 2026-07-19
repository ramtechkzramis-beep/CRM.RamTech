"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { parseClientRows, type RowError } from "@/lib/import-clients";

export type ImportState = {
  error: string | null;
  imported?: number;
  contactsImported?: number;
  skipped?: RowError[];
  done?: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

export async function importClientsFromExcel(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const profile = await requireProfile();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Выберите файл" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Файл больше 5 МБ. Разбейте его на части." };
  }

  let rows: unknown[][];

  try {
    // SheetJS читает и .xlsx, и старый .xls — заставлять пересохранять файл незачем.
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return { error: "В файле нет ни одного листа" };
    }

    // header: 1 — массив массивов, без попытки угадать заголовки: их разбираем сами.
    rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: null,
    });
  } catch {
    return {
      error: "Не удалось прочитать файл. Нужен Excel-файл (.xlsx или .xls).",
    };
  }

  if (rows.length < 2) {
    return { error: "В файле нет данных — только заголовки или пусто" };
  }

  const [headerRow, ...dataRows] = rows;
  const { clients, errors } = parseClientRows(headerRow, dataRows.slice(0, MAX_ROWS));

  if (clients.length === 0) {
    return {
      error: errors[0]?.message ?? "Не найдено ни одной подходящей строки",
      skipped: errors,
    };
  }

  const supabase = await createClient();

  // Не задваиваем то, что уже заведено: сверяем по названию.
  // Видимость определяет RLS, поэтому чужих клиентов проверка не покажет.
  const { data: existing } = await supabase
    .from("clients")
    .select("name")
    .in(
      "name",
      clients.map((c) => c.name),
    );

  const existingNames = new Set(
    (existing ?? []).map((c) => (c.name as string).toLowerCase()),
  );

  const toInsert = clients.filter((client) => {
    if (existingNames.has(client.name.toLowerCase())) {
      errors.push({ row: 0, message: `«${client.name}» уже есть в CRM — пропущен` });
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) {
    return { error: "Все клиенты из файла уже есть в CRM", skipped: errors };
  }

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert(
      toInsert.map((client) => ({
        name: client.name,
        city: client.city,
        business_size: client.business_size,
        source: client.source,
        notes: client.notes,
        // Первый контакт дублируем в карточку клиента, чтобы он был виден
        // в таблице списка без захода внутрь.
        contact_person: client.contacts[0]?.full_name ?? null,
        phone: client.contacts[0]?.phone ?? null,
        email: client.contacts[0]?.email ?? null,
        status: "cold" as const,
        owner_id: profile.id,
        department_id: profile.department_id,
        created_by: profile.id,
      })),
    )
    .select("id, name");

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}`, skipped: errors };
  }

  // Контакты вставляем одним запросом, привязывая по названию фирмы.
  const idByName = new Map(
    (inserted ?? []).map((row) => [(row.name as string).toLowerCase(), row.id as string]),
  );

  const contactRows = toInsert.flatMap((client) => {
    const clientId = idByName.get(client.name.toLowerCase());
    if (!clientId) return [];

    return client.contacts.map((contact, index) => ({
      client_id: clientId,
      full_name: contact.full_name,
      role: contact.role,
      position: contact.position,
      phone: contact.phone,
      email: contact.email,
      is_primary: index === 0,
    }));
  });

  let contactsImported = 0;

  if (contactRows.length > 0) {
    const { error: contactsError, count } = await supabase
      .from("client_contacts")
      .insert(contactRows, { count: "exact" });

    if (contactsError) {
      // Клиенты уже сохранены — молчать нельзя, иначе человек решит,
      // что контакты просто не заполнены в файле.
      return {
        error: `Клиенты загружены, но контакты сохранить не удалось: ${contactsError.message}`,
        imported: inserted?.length ?? 0,
        skipped: errors,
      };
    }

    contactsImported = count ?? contactRows.length;
  }

  revalidatePath("/clients/cold");

  return {
    error: null,
    done: true,
    imported: inserted?.length ?? 0,
    contactsImported,
    skipped: errors,
  };
}
