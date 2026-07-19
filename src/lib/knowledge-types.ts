/**
 * Типы базы знаний — без обращений к базе. Живут отдельно от knowledge.ts
 * по той же причине, что и client-types.ts: там Supabase и next/headers,
 * которые ломают сборку клиентского компонента, если притянуть их случайно.
 */

export type KnowledgeCategory =
  | "sales_scripts"
  | "chatbot_guides"
  | "company_values"
  | "technical"
  | "other";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "sales_scripts",
  "chatbot_guides",
  "company_values",
  "technical",
  "other",
];

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  sales_scripts: "Скрипты продаж",
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

export type KnowledgeArticle = {
  id: string;
  category: KnowledgeCategory;
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
