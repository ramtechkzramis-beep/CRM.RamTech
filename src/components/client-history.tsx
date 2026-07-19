"use client";

import { useActionState, useState } from "react";
import { History, Trash2 } from "lucide-react";
import {
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  OUTCOME_TONE,
  TASK_TYPE_LABELS,
  TASK_TYPE_STYLES,
} from "@/lib/task-types";
import type { TaskWithRelations } from "@/lib/task-types";
import type { ClientComment } from "@/lib/client-types";
import { addComment, deleteComment, type CommentState } from "@/app/(app)/clients/comment-actions";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatWhen(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;

  return isThisYear ? `${day}, ${time}` : `${day} ${date.getFullYear()}, ${time}`;
}

type TimelineItem =
  | { kind: "task"; at: string; task: TaskWithRelations }
  | { kind: "comment"; at: string; comment: ClientComment };

function DeleteCommentButton({ comment, clientId }: { comment: ClientComment; clientId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Удалить запись"
        className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <form action={deleteComment} className="inline-flex items-center gap-1">
      <input type="hidden" name="comment_id" value={comment.id} />
      <input type="hidden" name="client_id" value={clientId} />
      <span className="text-xs text-slate-500">Удалить?</span>
      <button
        type="submit"
        className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white transition hover:bg-red-700"
      >
        Да
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100"
      >
        Нет
      </button>
    </form>
  );
}

/**
 * Летопись работы с компанией: закрытые задачи и ручные заметки — в одной
 * ленте, а не в двух разных местах. Нужна перед звонком: видно, о чём
 * говорили в прошлый раз и чем закончилось, даже если работал другой
 * сотрудник.
 */
export function ClientHistory({
  clientId,
  currentUserId,
  canManage,
  history,
  comments,
}: {
  clientId: string;
  currentUserId: string;
  /** Руководитель может удалить чужую заметку, не только свою. */
  canManage: boolean;
  history: TaskWithRelations[];
  comments: ClientComment[];
}) {
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState<CommentState, FormData>(
    async (prevState, formData) => {
      const result = await addComment(prevState, formData);
      if (result.ok) setText("");
      return result;
    },
    { error: null },
  );

  const items: TimelineItem[] = [
    ...history
      .filter((task) => task.completed_at)
      .map((task): TimelineItem => ({ kind: "task", at: task.completed_at!, task })),
    ...comments.map((comment): TimelineItem => ({
      kind: "comment",
      at: comment.created_at,
      comment,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <History className="size-4 text-slate-400" />
        История работы
        {items.length > 0 && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {items.length}
          </span>
        )}
      </h2>

      <form action={formAction} className="mb-3 space-y-1.5">
        <input type="hidden" name="client_id" value={clientId} />
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Например: звонил, попросил перезвонить завтра после обеда"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <div className="flex items-center justify-between">
          {state.error && <p className="text-xs text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="ml-auto rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-xs font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
          >
            {pending ? "Добавляем…" : "Добавить заметку"}
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          С этой компанией ещё не работали. История появится, когда закроете
          первую задачу или добавите заметку.
        </div>
      ) : (
        // Та же высота, что у списка задач выше: примерно четыре записи,
        // дальше прокрутка.
        <ul className="max-h-[19rem] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            if (item.kind === "comment") {
              const { comment } = item;
              return (
                <li
                  key={`comment-${comment.id}`}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-medium text-slate-500">{formatWhen(item.at)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-slate-600">
                        {comment.author_name ?? "—"}
                      </span>
                    </div>
                    {(canManage || comment.author_id === currentUserId) && (
                      <DeleteCommentButton comment={comment} clientId={clientId} />
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {comment.text}
                  </p>
                </li>
              );
            }

            const { task } = item;
            const isCancelled = !!task.outcome && OUTCOME_TONE[task.outcome] === "bad";

            return (
              <li
                key={`task-${task.id}`}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-500">{formatWhen(item.at)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600">
                    {task.assignee?.full_name ?? "—"}
                  </span>
                </div>

                <p
                  className={`mt-1 text-sm ${
                    isCancelled ? "text-slate-400 line-through" : "text-slate-500"
                  }`}
                >
                  {task.title}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 opacity-70">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_TYPE_STYLES[task.type]}`}
                  >
                    {TASK_TYPE_LABELS[task.type]}
                  </span>
                  {task.outcome && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${OUTCOME_STYLES[OUTCOME_TONE[task.outcome]]}`}
                    >
                      {OUTCOME_LABELS[task.outcome]}
                    </span>
                  )}
                </div>

                {task.outcome_note && (
                  <p className="mt-1.5 rounded bg-white px-2 py-1.5 text-xs text-slate-600">
                    {task.outcome_note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
