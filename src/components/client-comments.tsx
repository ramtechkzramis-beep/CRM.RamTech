"use client";

import { useActionState, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { addComment, deleteComment, type CommentState } from "@/app/(app)/clients/comment-actions";
import type { ClientComment } from "@/lib/client-types";
import { formatDateTimeRu } from "@/lib/dates";

function DeleteCommentButton({
  comment,
  clientId,
}: {
  comment: ClientComment;
  clientId: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Удалить комментарий"
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

export function ClientComments({
  clientId,
  comments,
  currentUserId,
  canManage,
}: {
  clientId: string;
  comments: ClientComment[];
  currentUserId: string;
  /** Руководитель может удалить любой комментарий, не только свой. */
  canManage: boolean;
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MessageSquare className="size-4 text-slate-400" />
        Комментарии
        {comments.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {comments.length}
          </span>
        )}
      </h2>

      <form action={formAction} className="mb-4 space-y-2">
        <input type="hidden" name="client_id" value={clientId} />
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Например: звонил, попросил перезвонить завтра после обеда"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <div className="flex items-center justify-between">
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="ml-auto rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-1.5 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
          >
            {pending ? "Добавляем…" : "Добавить"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">Комментариев пока нет.</p>
      ) : (
        <ul className="space-y-3 border-t border-slate-100 pt-3">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-slate-700">{comment.text}</p>
                {(canManage || comment.author_id === currentUserId) && (
                  <DeleteCommentButton comment={comment} clientId={clientId} />
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {comment.author_name ?? "—"} · {formatDateTimeRu(comment.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
