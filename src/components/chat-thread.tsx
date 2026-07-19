"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { EmojiPicker } from "@/components/emoji-picker";
import {
  messageStatus,
  type ChatMessage,
  type DirectoryEmployee,
  type MessageStatus,
} from "@/lib/chat-types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "sent") {
    return <Check className="size-3.5 text-white/60" />;
  }

  // Доставлено — серые галочки, прочитано — те же галочки светлее и ярче:
  // ровно тот жест, к которому все привыкли по WhatsApp/Telegram.
  return (
    <CheckCheck
      className={`size-3.5 ${status === "read" ? "text-sky-300" : "text-white/60"}`}
    />
  );
}

export function ChatThread({
  title,
  isGroup,
  messages,
  currentUserId,
  profilesById,
  otherLastReadAt,
  headerAction,
  onBack,
  onSend,
}: {
  title: string;
  isGroup: boolean;
  messages: ChatMessage[];
  currentUserId: string;
  profilesById: Map<string, DirectoryEmployee>;
  /** Когда собеседник последний раз читал диалог — null для группового чата. */
  otherLastReadAt: string | null;
  /** Кнопка справа в шапке — например, «участники» у группового чата. */
  headerAction?: React.ReactNode;
  onBack: () => void;
  onSend: (body: string) => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Прокручиваем к последнему сообщению при открытии и при получении нового.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function submit() {
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText("");
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;

    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);

    // Курсор восстанавливаем после ре-рендера — до него selectionStart ещё
    // указывает на старую, более короткую строку.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад к списку чатов"
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {title}
        </span>
        {headerAction}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Сообщений пока нет — напишите первым.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            const senderName = profilesById.get(message.sender_id)?.full_name;
            const status = messageStatus(message, otherLastReadAt);

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {/* В групповом чате отдела нужно видеть, кто написал — в личном
                    это и так очевидно из направления сообщения. */}
                {isGroup && !isMine && senderName && (
                  <span className="mb-0.5 px-1 text-xs font-medium text-slate-500">
                    {senderName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? "bg-gradient-to-r from-brand to-brand-dark text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
                <span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-slate-400">
                  {formatTime(message.created_at)}
                  {/* Статус только для своих сообщений в личном чате: в группе
                      получателей несколько, и одна галочка ничего не значит. */}
                  {isMine && !isGroup && <StatusTicks status={status} />}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-1.5 border-t border-slate-100 p-2.5">
        <EmojiPicker onPick={insertEmoji} />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Написать сообщение…"
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Отправить"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-brand to-brand-dark text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
