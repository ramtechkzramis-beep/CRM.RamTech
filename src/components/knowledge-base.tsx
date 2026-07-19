"use client";

import { useState, useTransition } from "react";
import { BookOpen, Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight } from "lucide-react";
import { createArticle, updateArticle, deleteArticle } from "@/app/(app)/knowledge/actions";
import {
  KNOWLEDGE_CATEGORIES,
  CATEGORY_LABELS,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/lib/knowledge-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function ArticleForm({
  article,
  defaultCategory,
  onClose,
}: {
  article?: KnowledgeArticle;
  defaultCategory: KnowledgeCategory;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<KnowledgeCategory>(
    article?.category ?? defaultCategory,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = !!article;

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const action = isEdit ? updateArticle : createArticle;
      const result = await action({ error: null }, formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          {isEdit ? "Изменить материал" : "Новый материал"}
        </h3>

        <form action={handleAction} className="space-y-4">
          {isEdit && <input type="hidden" name="article_id" value={article.id} />}

          <div className="space-y-1.5">
            <label htmlFor="category" className="text-sm font-medium text-slate-700">
              Категория
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              className={FIELD_CLASS}
            >
              {KNOWLEDGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Название
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={article?.title}
              placeholder="Например: Скрипт холодного звонка"
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="content" className="text-sm font-medium text-slate-700">
              Текст
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              defaultValue={article?.content ?? ""}
              placeholder="Текст скрипта, инструкции или заметки — необязательно, если прикладываете файл"
              className={FIELD_CLASS}
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <label htmlFor="file" className="block text-sm font-medium text-slate-700">
                Файл (необязательно)
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
              />
              <p className="text-xs text-slate-500">
                PDF, Word, PowerPoint или текстовый файл. До 20 МБ.
              </p>
            </div>
          )}

          {isEdit && article?.storage_path && (
            <p className="text-xs text-slate-500">
              Прикреплённый файл: {article.file_name}. Чтобы заменить — удалите материал и
              добавьте заново.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteButton({ article }: { article: KnowledgeArticle }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Удалить ${article.title}`}
        className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  // Материал удаляется вместе с файлом и не восстанавливается — спрашиваем.
  return (
    <form action={deleteArticle} className="flex items-center gap-1.5">
      <input type="hidden" name="article_id" value={article.id} />
      <input type="hidden" name="storage_path" value={article.storage_path ?? ""} />
      <span className="text-xs text-slate-500">Удалить?</span>
      <button
        type="submit"
        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700"
      >
        Да
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
      >
        Нет
      </button>
    </form>
  );
}

function ArticleCard({
  article,
  url,
  canManage,
}: {
  article: KnowledgeArticle;
  url: string | null;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          )}
          <h4 className="font-medium text-slate-900">{article.title}</h4>
        </button>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Изменить ${article.title}`}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="size-3.5" />
            </button>
            <DeleteButton article={article} />
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {article.content && (
            <p className="whitespace-pre-wrap text-sm text-slate-600">{article.content}</p>
          )}

          {article.storage_path &&
            (url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark hover:underline"
              >
                <Download className="size-3.5" />
                {article.file_name ?? "Скачать файл"}
                {article.file_size && (
                  <span className="text-xs font-normal text-slate-400">
                    ({formatSize(article.file_size)})
                  </span>
                )}
              </a>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Файл недоступен</p>
            ))}

          <p className="mt-2 text-xs text-slate-400">
            {new Date(article.created_at).toLocaleDateString("ru-RU")}
          </p>
        </div>
      )}

      {editing && (
        <ArticleForm
          article={article}
          defaultCategory={article.category}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}

export function KnowledgeBase({
  articles,
  urls,
  canManage,
}: {
  articles: KnowledgeArticle[];
  urls: Record<string, string | null>;
  canManage: boolean;
}) {
  const [adding, setAdding] = useState<KnowledgeCategory | null>(null);

  return (
    <div className="space-y-6">
      {KNOWLEDGE_CATEGORIES.map((category) => {
        const items = articles.filter((a) => a.category === category);

        return (
          <div key={category} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="size-4 text-slate-400" />
                {CATEGORY_LABELS[category]}
                {items.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {items.length}
                  </span>
                )}
              </h2>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setAdding(category)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="size-3.5" />
                  Добавить
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-500">
                {canManage
                  ? "Материалов пока нет."
                  : "Материалов пока нет — добавит руководитель."}
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    url={urls[article.id] ?? null}
                    canManage={canManage}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {adding && (
        <ArticleForm defaultCategory={adding} onClose={() => setAdding(null)} />
      )}
    </div>
  );
}
