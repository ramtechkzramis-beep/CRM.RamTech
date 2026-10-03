"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Download,
  Folder,
  Heart,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { createArticle, updateArticle, deleteArticle } from "@/app/(app)/knowledge/actions";
import { LogoMark } from "@/components/logo";
import {
  KNOWLEDGE_CATEGORIES,
  CATEGORY_LABELS,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/lib/knowledge-types";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

/** Иконка и цвет плитки у раздела — чтобы разделы различались с одного взгляда. */
const CATEGORY_ICONS: Record<
  KnowledgeCategory,
  { icon: typeof Bot; tile: string }
> = {
  sales_scripts: { icon: Phone, tile: "bg-brand-soft text-brand-dark" },
  chatbot_guides: { icon: Bot, tile: "bg-sky-50 text-sky-700" },
  company_values: { icon: Heart, tile: "bg-amber-50 text-amber-700" },
  technical: { icon: Wrench, tile: "bg-emerald-50 text-emerald-700" },
  other: { icon: Folder, tile: "bg-slate-100 text-slate-600" },
};

/** Сколько скриптов идут до встречи — остальные это её этапы. */
const BEFORE_MEETING = 2;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function pluralMaterials(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "материал";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "материала";
  return "материалов";
}

function pluralScripts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "скрипт";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "скрипта";
  return "скриптов";
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
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
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
        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" />
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

/** Широкая карточка материала — список разделов и результаты поиска. */
function ArticleRow({
  article,
  label,
  index,
  onOpen,
}: {
  article: KnowledgeArticle;
  label?: string;
  index: number;
  onOpen: () => void;
}) {
  const { icon: Icon, tile } =
    CATEGORY_ICONS[article.category] ?? CATEGORY_ICONS.other;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          index % 2 === 1 ? "bg-emerald-50 text-emerald-700" : tile
        }`}
      >
        <Icon className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        {label && <span className="block text-xs text-slate-400">{label}</span>}
        <span className="block font-semibold text-slate-900">{article.title}</span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-slate-300" />
    </button>
  );
}

/** Этап встречи — карточка в ленте пути продажи. */
function StageCard({
  article,
  number,
  isLast,
  onOpen,
}: {
  article: KnowledgeArticle;
  number: number;
  isLast: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-full w-[160px] shrink-0 flex-col gap-3 rounded-2xl border p-4 text-left transition ${
        isLast
          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
      }`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
          isLast ? "bg-brand text-white" : "border-2 border-brand text-brand"
        }`}
      >
        {isLast ? <Check className="size-4" /> : number}
      </span>

      <span className="min-w-0">
        {isLast && (
          <span className="block text-xs text-slate-400">Этап {number}</span>
        )}
        <span className="block text-sm font-semibold leading-snug">{article.title}</span>
      </span>
    </button>
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
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [category, setCategory] = useState<KnowledgeCategory>("sales_scripts");
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K — руки остаются на клавиатуре: менеджер ищет формулировку
  // прямо во время разговора с клиентом.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const query = search.trim().toLowerCase();
  const found = query
    ? articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          (article.content ?? "").toLowerCase().includes(query),
      )
    : null;

  const scripts = articles.filter((a) => a.category === "sales_scripts");
  const beforeMeeting = scripts.slice(0, BEFORE_MEETING);
  const meetingStages = scripts.slice(BEFORE_MEETING);

  const open = openId ? articles.find((a) => a.id === openId) ?? null : null;
  const openUrl = open ? urls[open.id] ?? null : null;

  // Разделы, кроме скриптов, — блок «Другие разделы» внизу.
  const otherCategories = KNOWLEDGE_CATEGORIES.filter((c) => c !== "sales_scripts");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-7 text-white">
        {/* Знак из логотипа вместо пустого поля — шапка узнаётся как наша. */}
        <LogoMark className="pointer-events-none absolute -right-8 -top-6 size-56 text-white/[0.06]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">
              Скрипты продаж, инструкции и ценности компании
            </p>
            <h1 className="mt-1 text-[32px] font-bold leading-none">База знаний</h1>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setAdding(category)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              <Plus className="size-4" />
              Новый материал
            </button>
          )}
        </div>

        <div className="relative mt-5 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Что сказать, если клиент говорит «дорого»?"
            aria-label="Поиск по базе знаний"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <kbd className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
            Ctrl K
          </kbd>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {KNOWLEDGE_CATEGORIES.map((item) => {
            const count = articles.filter((a) => a.category === item).length;
            const isActive = !query && category === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory(item);
                }}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                  isActive
                    ? "bg-white font-medium text-slate-900"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {CATEGORY_LABELS[item]}
                <span className={isActive ? "text-slate-400" : "text-slate-500"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Открытый материал — над списком, чтобы не искать, куда он развернулся. */}
      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">{CATEGORY_LABELS[open.category]}</p>
              <h2 className="mt-0.5 text-xl font-semibold text-slate-900">{open.title}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(open)}
                    aria-label={`Изменить ${open.title}`}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <DeleteButton article={open} />
                </>
              )}
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Закрыть материал"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {open.content && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {open.content}
            </p>
          )}

          {open.storage_path &&
            (openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                <Download className="size-4" />
                {open.file_name ?? "Скачать файл"}
                {open.file_size && (
                  <span className="text-xs font-normal text-slate-400">
                    ({formatSize(open.file_size)})
                  </span>
                )}
              </a>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Файл недоступен</p>
            ))}
        </div>
      )}

      {found ? (
        <div>
          <h2 className="mb-2.5 text-[11px] uppercase tracking-wider text-slate-400">
            Найдено · {found.length}
          </h2>

          {found.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              По запросу «{search.trim()}» ничего не нашлось.
            </div>
          ) : (
            <div className="space-y-3">
              {found.map((article, index) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  label={CATEGORY_LABELS[article.category]}
                  index={index}
                  onOpen={() => setOpenId(article.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : category === "sales_scripts" ? (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Путь продажи</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {scripts.length} {pluralScripts(scripts.length)} по порядку — от подготовки
                  до закрытия сделки
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setAdding("sales_scripts")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="size-4" />
                  Добавить скрипт
                </button>
              )}
            </div>

            {scripts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
                Скриптов пока нет{canManage ? " — добавьте первый." : " — добавит руководитель."}
              </div>
            ) : (
              <>
                {beforeMeeting.length > 0 && (
                  <>
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400">
                      До встречи
                    </p>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {beforeMeeting.map((article, index) => (
                        <ArticleRow
                          key={article.id}
                          article={article}
                          label={`Скрипт ${index + 1}`}
                          index={index}
                          onOpen={() => setOpenId(article.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {meetingStages.length > 0 && (
                  <>
                    <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-slate-400">
                      Встреча · {meetingStages.length}{" "}
                      {meetingStages.length === 1 ? "этап" : "этапов"}
                    </p>
                    {/* Этапы в один ряд с прокруткой: порядок — часть смысла,
                        переносить их в сетку нельзя. */}
                    <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
                      {meetingStages.map((article, index) => (
                        <div key={article.id} className="flex items-stretch">
                          {/* Соединитель по центру, а карточки одной высоты —
                              иначе лента этапов идёт «лесенкой». */}
                          {index > 0 && (
                            <span
                              className="h-px w-4 shrink-0 self-center bg-slate-200"
                              aria-hidden
                            />
                          )}
                          <StageCard
                            article={article}
                            number={index + 1}
                            isLast={index === meetingStages.length - 1}
                            onOpen={() => setOpenId(article.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">Другие разделы</h2>

            <div className="grid gap-3 lg:grid-cols-2">
              {otherCategories.map((item) => {
                const items = articles.filter((a) => a.category === item);
                const { icon: Icon, tile } = CATEGORY_ICONS[item];

                if (items.length === 0) {
                  return (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4"
                    >
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tile}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {CATEGORY_LABELS[item]}
                        </p>
                        <p className="text-sm text-slate-500">
                          Пока пусто — расскажите новичкам, как вы работаете
                        </p>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setAdding(item)}
                          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Добавить
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tile}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">
                        {CATEGORY_LABELS[item]}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {items.length} {pluralMaterials(items.length)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{CATEGORY_LABELS[category]}</h2>
            {canManage && (
              <button
                type="button"
                onClick={() => setAdding(category)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="size-4" />
                Добавить
              </button>
            )}
          </div>

          {articles.filter((a) => a.category === category).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              {canManage
                ? "Материалов пока нет — добавьте первый."
                : "Материалов пока нет — добавит руководитель."}
            </div>
          ) : (
            <div className="space-y-3">
              {articles
                .filter((a) => a.category === category)
                .map((article, index) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    index={index}
                    onOpen={() => setOpenId(article.id)}
                  />
                ))}
            </div>
          )}
        </section>
      )}

      {adding && <ArticleForm defaultCategory={adding} onClose={() => setAdding(null)} />}
      {editing && (
        <ArticleForm
          article={editing}
          defaultCategory={editing.category}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
