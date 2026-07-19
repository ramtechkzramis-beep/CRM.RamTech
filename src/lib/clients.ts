import { createClient } from "@/lib/supabase/server";
import type {
  ClientContact,
  ClientDocument,
  ClientPayment,
  ClientSort,
  ClientWithSegment,
} from "@/lib/client-types";

/** Сколько компаний показываем на одной странице холодной базы. */
export const COLD_PAGE_SIZE = 45;

export type ColdClientsFilters = {
  /** Поиск по названию, контактному лицу и телефону. */
  query?: string;
  ownerId?: string;
  city?: string;
  /** Добавленные в конкретный день, YYYY-MM-DD. */
  addedDate?: string;
  sort?: ClientSort;
  /** Страница, начиная с 1. */
  page?: number;
};

export type ColdClientsResult = {
  clients: ClientWithSegment[];
  /** Сколько всего компаний подходит под фильтр — для расчёта числа страниц. */
  total: number;
};

/**
 * Холодная база. Фильтруем и постранично режем в запросе, а не в приложении:
 * после импорта тут тысячи клиентов, и тащить их все ради одной страницы —
 * пустая трата, к тому же список было невозможно пролистать до конца.
 */
export async function getColdClients(
  filters: ColdClientsFilters = {},
): Promise<ColdClientsResult> {
  const supabase = await createClient();

  let query = supabase
    .from("clients_with_segment")
    .select("*", { count: "exact" })
    .eq("status", "cold");

  if (filters.query) {
    // Запятые и скобки в названии («ТОО Ромашка, компания») развалили бы or().
    const safe = filters.query.replace(/[,()]/g, " ").trim();

    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,contact_person.ilike.%${safe}%,phone.ilike.%${safe}%`,
      );
    }
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  if (filters.city) {
    query = query.eq("city", filters.city);
  }

  if (filters.addedDate) {
    // created_at — момент времени, поэтому берём весь день целиком.
    const next = new Date(`${filters.addedDate}T00:00:00`);
    next.setDate(next.getDate() + 1);

    query = query
      .gte("created_at", new Date(`${filters.addedDate}T00:00:00`).toISOString())
      .lt("created_at", next.toISOString());
  }

  switch (filters.sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "created_asc":
      query = query.order("created_at", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * COLD_PAGE_SIZE;
  const to = from + COLD_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { clients: (data ?? []) as ClientWithSegment[], total: count ?? 0 };
}

/** Города холодной базы — для фильтра. */
export async function getColdCities(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("city")
    .eq("status", "cold")
    .not("city", "is", null);

  const cities = new Set((data ?? []).map((row) => row.city as string));
  return [...cities].sort((a, b) => a.localeCompare(b, "ru"));
}

/** Дни, в которые пополняли холодную базу, — для фильтра. */
export async function getColdAddedDates(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("created_at")
    .eq("status", "cold")
    .order("created_at", { ascending: false });

  const days = new Set(
    (data ?? []).map((row) => (row.created_at as string).slice(0, 10)),
  );
  return [...days];
}

export type ActiveClientsFilters = {
  /** Поиск по названию, контактному лицу и телефону. */
  query?: string;
  ownerId?: string;
  sort?: ClientSort;
};

/**
 * Текущие клиенты. По умолчанию ближайшие к продлению — сверху.
 *
 * Поиск и фильтр по куратору делаем запросом в БД, а не в приложении:
 * после импорта базы клиентов тысячи, и тащить их все ради фильтра — глупо.
 */
export async function getActiveClients(
  filters: ActiveClientsFilters = {},
): Promise<ClientWithSegment[]> {
  const supabase = await createClient();

  let query = supabase
    .from("clients_with_segment")
    .select("*")
    .eq("status", "active");

  if (filters.query) {
    // Экранируем спецсимволы PostgREST: запятая и скобки в названии
    // («ТОО Ромашка, компания») развалили бы условие or().
    const safe = filters.query.replace(/[,()]/g, " ").trim();

    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,contact_person.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`,
      );
    }
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  switch (filters.sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "created":
      query = query.order("created_at", { ascending: false });
      break;
    case "created_asc":
      query = query.order("created_at", { ascending: true });
      break;
    default:
      // Клиенты без начатого ППС уходят вниз: у них нет даты продления.
      query = query.order("renewal_date", { ascending: true, nullsFirst: false });
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientWithSegment[];
}

/** Архив — клиенты, убранные из текущих. Сортировка: недавно убранные сверху. */
export async function getArchivedClients(): Promise<ClientWithSegment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients_with_segment")
    .select("*")
    .eq("status", "archived")
    .order("archived_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientWithSegment[];
}

export async function getClient(id: string): Promise<ClientWithSegment | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients_with_segment")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as ClientWithSegment) ?? null;
}

export async function getClientContacts(clientId: string): Promise<ClientContact[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientContact[];
}

export async function getClientPayments(clientId: string): Promise<ClientPayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_payments")
    .select("*")
    .eq("client_id", clientId)
    .order("seq");

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientPayment[];
}

export async function getClientDocuments(clientId: string): Promise<ClientDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ClientDocument[];
}

/**
 * Временная ссылка на скан. Бакет приватный, поэтому прямых URL нет:
 * ссылка живёт час и не утекает наружу вместе с пересланным адресом.
 */
export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(storagePath, 60 * 60);

  return data?.signedUrl ?? null;
}
