/**
 * Типы и подписи, связанные с клиентами, — без обращений к базе.
 *
 * Живут отдельно от clients.ts осознанно: там Supabase и next/headers, которые
 * ломают сборку, стоит их случайно притянуть в браузерный компонент. Всё, что
 * нужно и формам, и серверу, кладём сюда.
 */

import type { Segment } from "@/lib/segments";
import type { ContractMonths, ServicePackage } from "@/lib/packages";
import type { ProjectStage } from "@/lib/stages";
import type { PaymentScheme } from "@/lib/payments";

export type ClientStatus = "cold" | "active" | "archived";
export type ClientSort = "renewal" | "name" | "created" | "created_asc";

export type ClientArchiveReason =
  | "client_request"
  | "non_payment"
  | "dissatisfied"
  | "business_closed"
  | "competitor"
  | "other";

export const CLIENT_ARCHIVE_REASONS: ClientArchiveReason[] = [
  "client_request",
  "non_payment",
  "dissatisfied",
  "business_closed",
  "competitor",
  "other",
];

export const ARCHIVE_REASON_LABELS: Record<ClientArchiveReason, string> = {
  client_request: "Клиент отказался от услуг",
  non_payment: "Не оплачивает / просрочка",
  dissatisfied: "Недоволен качеством",
  business_closed: "Бизнес клиента закрылся",
  competitor: "Ушёл к конкурентам",
  other: "Другое",
};

export function isArchiveReason(
  value: string | null | undefined,
): value is ClientArchiveReason {
  return !!value && (CLIENT_ARCHIVE_REASONS as string[]).includes(value);
}

export const CLIENT_SORT_LABELS: Record<ClientSort, string> = {
  renewal: "Ближе к продлению",
  name: "По названию",
  created: "Сначала новые",
  created_asc: "Сначала старые",
};

export function isClientSort(value: string | undefined): value is ClientSort {
  return !!value && value in CLIENT_SORT_LABELS;
}
export type BusinessSize = "small" | "medium" | "large";
export type ContactRole = "decision_maker" | "influencer" | "employee";
export type LoyaltyLevel = "green" | "yellow" | "red";

export const LOYALTY_LEVELS: LoyaltyLevel[] = ["green", "yellow", "red"];

export const LOYALTY_LABELS: Record<LoyaltyLevel, string> = {
  green: "Зелёный",
  yellow: "Жёлтый",
  red: "Красный",
};

/** Расшифровка для новых сотрудников: что именно значит цвет. */
export const LOYALTY_DESCRIPTIONS: Record<LoyaltyLevel, string> = {
  green: "Клиент всем доволен",
  yellow: "Клиент немного недоволен продуктом",
  red: "Клиент не хочет с нами работать, продукт не нравится",
};

export const LOYALTY_CHANCE: Record<LoyaltyLevel, string> = {
  green: "80–100%",
  yellow: "50–80%",
  red: "0–50%",
};

export const LOYALTY_STYLES: Record<LoyaltyLevel, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
};

export const LOYALTY_DOTS: Record<LoyaltyLevel, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

export const BUSINESS_SIZE_LABELS: Record<BusinessSize, string> = {
  small: "Малый",
  medium: "Средний",
  large: "Крупный",
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  decision_maker: "Принимает решение",
  influencer: "Влияет на решение",
  employee: "Сотрудник",
};

export const CONTACT_ROLE_STYLES: Record<ContactRole, string> = {
  decision_maker: "bg-emerald-100 text-emerald-800",
  influencer: "bg-sky-100 text-sky-800",
  employee: "bg-slate-100 text-slate-600",
};

export type Client = {
  id: string;
  name: string;
  city: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  business_size: BusinessSize | null;
  source: string | null;
  notes: string | null;
  status: ClientStatus;
  /** Дата подписания договора — не путать с началом ППС. */
  contract_signed_date: string | null;
  /** Начало текущего цикла ППС. Пусто, пока проект не одобрен. */
  cycle_start_date: string | null;
  package: ServicePackage | null;
  contract_months: ContractMonths;
  development_price: number | null;
  subscription_price: number | null;
  /** Скидка 0–20%, действует на всю сделку. */
  discount_percent: number;
  payment_scheme: PaymentScheme | null;
  loyalty: LoyaltyLevel | null;
  loyalty_note: string | null;
  loyalty_updated_at: string | null;
  stage: ProjectStage | null;
  stage_updated_at: string | null;
  owner_id: string;
  department_id: string | null;
  created_at: string;
  created_by: string | null;
  /** Заполняются только при переводе в архив (status = 'archived'). */
  archived_reason: ClientArchiveReason | null;
  archived_comment: string | null;
  archived_at: string | null;
  archived_by: string | null;
};

export type DocumentKind = "contract" | "invoice" | "act" | "other";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  contract: "Договор",
  invoice: "Счёт",
  act: "Акт",
  other: "Другое",
};

export type ClientPayment = {
  id: string;
  client_id: string;
  seq: number;
  percent: number;
  amount: number;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
};

export type ClientDocument = {
  id: string;
  client_id: string;
  kind: DocumentKind;
  title: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

/** Клиент из view clients_with_segment: сегмент и сроки считает база. */
export type ClientWithSegment = Client & {
  owner_name: string | null;
  archived_by_name: string | null;
  month_in_cycle: number | null;
  segment: Segment | null;
  renewal_date: string | null;
  days_to_renewal: number | null;
};

export type ClientContact = {
  id: string;
  client_id: string;
  full_name: string;
  role: ContactRole | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
};
