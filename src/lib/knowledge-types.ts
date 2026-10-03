/**
 * Типы базы знаний — без обращений к базе. Живут отдельно от knowledge.ts
 * по той же причине, что и client-types.ts: там Supabase и next/headers,
 * которые ломают сборку клиентского компонента, если притянуть их случайно.
 */

export type KnowledgeCategory =
  | "sales_scripts"
  | "policies"
  | "chatbot_guides"
  | "company_values"
  | "technical"
  | "other";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "sales_scripts",
  "policies",
  "chatbot_guides",
  "company_values",
  "technical",
  "other",
];

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  sales_scripts: "Скрипты продаж",
  // Категории клиентов, статусы ППС, рассрочки и система бонусов —
  // от этих материалов напрямую зависит зарплата, поэтому они отдельно,
  // а не в «Другом».
  policies: "Регламенты и деньги",
  chatbot_guides: "Инструкции по чат-ботам",
  company_values: "Ценности компании",
  // Сроки разработки ботов, сам процесс их создания, CRM-системы —
  // адресовано в первую очередь отделу разработки, но открыто всем.
  technical: "Разработка ботов и CRM",
  other: "Другое",
};

export function isKnowledgeCategory(value: string | null | undefined): value is KnowledgeCategory {
  return !!value && (KNOWLEDGE_CATEGORIES as string[]).includes(value);
}

/**
 * Для кого материал. Обучение операторов call-центра и менеджеров по продажам
 * различается, но часть блоков общая — она лежит один раз с аудиторией «all»,
 * а не копией в каждой роли.
 */
export type KnowledgeAudience = "all" | "leadgen" | "sales";

export const KNOWLEDGE_AUDIENCES: KnowledgeAudience[] = ["all", "leadgen", "sales"];

export const AUDIENCE_LABELS: Record<KnowledgeAudience, string> = {
  all: "Для всех",
  leadgen: "Лидген",
  sales: "Менеджер",
};

/** Подпись в фильтре — там нужна роль целиком, а не короткий значок. */
export const AUDIENCE_FILTER_LABELS: Record<KnowledgeAudience, string> = {
  all: "Общие материалы",
  leadgen: "Оператор call-центра",
  sales: "Менеджер по продажам",
};

export const AUDIENCE_STYLES: Record<KnowledgeAudience, string> = {
  all: "bg-slate-100 text-slate-600",
  leadgen: "bg-sky-50 text-sky-700",
  sales: "bg-brand-soft text-brand-dark",
};

export function isKnowledgeAudience(
  value: string | null | undefined,
): value is KnowledgeAudience {
  return !!value && (KNOWLEDGE_AUDIENCES as string[]).includes(value);
}

export type KnowledgeArticle = {
  id: string;
  category: KnowledgeCategory;
  /** Кому адресован материал: обеим ролям, лидгенам или менеджерам. */
  audience: KnowledgeAudience;
  title: string;
  content: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  author_id: string | null;
  /** Порядок внутри категории — важно для последовательных материалов вроде курса по этапам сделки. */
  sort_order: number;
  created_at: string;
  updated_at: string;
};
