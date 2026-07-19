import { requireProfile } from "@/lib/auth";
import { canManageKnowledge } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { KnowledgeBase } from "@/components/knowledge-base";
import { getKnowledgeArticles, getKnowledgeFileUrl } from "@/lib/knowledge";

export default async function KnowledgePage() {
  const [profile, articles] = await Promise.all([requireProfile(), getKnowledgeArticles()]);

  // Бакет приватный, поэтому на каждый файл берём временную ссылку.
  const urls = Object.fromEntries(
    await Promise.all(
      articles
        .filter((article) => article.storage_path)
        .map(async (article) => [article.id, await getKnowledgeFileUrl(article.storage_path!)]),
    ),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="База знаний"
        subtitle="Скрипты продаж, инструкции по чат-ботам и ценности компании — в одном месте."
      />

      <KnowledgeBase
        articles={articles}
        urls={urls}
        canManage={canManageKnowledge(profile.role)}
      />
    </div>
  );
}
