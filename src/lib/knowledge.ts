import { createClient } from "@/lib/supabase/server";
import type { KnowledgeArticle } from "@/lib/knowledge-types";

export async function getKnowledgeArticles(): Promise<KnowledgeArticle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("*")
    .order("category")
    .order("sort_order")
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as KnowledgeArticle[];
}

/**
 * Временная ссылка на файл. Бакет приватный, поэтому прямых URL нет:
 * ссылка живёт час и не утекает наружу вместе с пересланным адресом.
 */
export async function getKnowledgeFileUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(storagePath, 60 * 60);

  return data?.signedUrl ?? null;
}
