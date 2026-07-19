"use client";

import { Plus, Users, UsersRound } from "lucide-react";
import {
  conversationTitle,
  type ConversationSummary,
  type DirectoryEmployee,
} from "@/lib/chat-types";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "сейчас";
  if (diffMinutes < 60) return `${diffMinutes} мин`;
  if (diffMinutes < 60 * 24) return `${Math.round(diffMinutes / 60)} ч`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ChatConversationList({
  conversations,
  currentUserId,
  profilesById,
  canCreateGroup,
  onOpen,
  onNewDm,
  onNewGroup,
}: {
  conversations: ConversationSummary[];
  currentUserId: string;
  profilesById: Map<string, DirectoryEmployee>;
  canCreateGroup: boolean;
  onOpen: (conversationId: string) => void;
  onNewDm: () => void;
  onNewGroup: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <span className="text-sm font-semibold text-slate-900">Чаты</span>
        <span className="flex items-center gap-1.5">
          {canCreateGroup && (
            <button
              type="button"
              onClick={onNewGroup}
              title="Создать групповой чат"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <UsersRound className="size-3.5" />
              Группа
            </button>
          )}
          <button
            type="button"
            onClick={onNewDm}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="size-3.5" />
            Написать
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Чатов пока нет — начните первый.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {conversations.map((conversation) => {
              const title = conversationTitle(conversation, currentUserId, profilesById);
              const isUnread = conversation.unread_count > 0;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(conversation.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                        conversation.kind === "department"
                          ? "bg-slate-400"
                          : conversation.kind === "group"
                            ? "bg-violet-500"
                            : "bg-gradient-to-br from-brand to-brand-dark"
                      }`}
                    >
                      {conversation.kind === "department" || conversation.kind === "group" ? (
                        <Users className="size-4" />
                      ) : (
                        title.slice(0, 1).toUpperCase()
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            isUnread ? "font-semibold text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {title}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {formatWhen(conversation.last_message_at)}
                        </span>
                      </span>
                      <span
                        className={`block truncate text-xs ${
                          isUnread ? "font-medium text-slate-700" : "text-slate-500"
                        }`}
                      >
                        {conversation.last_message_body ?? "Нет сообщений"}
                      </span>
                    </span>

                    {isUnread && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
                        {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
