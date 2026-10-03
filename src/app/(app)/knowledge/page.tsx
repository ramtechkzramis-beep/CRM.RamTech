import { requireProfile } from "@/lib/auth";
import { canManageKnowledge } from "@/lib/types";
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

  // Заголовок — внутри тёмной шапки самой базы знаний, поэтому общий
  // PageHeader здесь не нужен.
  return (
    <div className="max-w-5xl">
      <KnowledgeBase
        articles={articles}
        urls={urls}
        canManage={canManageKnowledge(profile.role)}
      />
    </div>
  );
}
