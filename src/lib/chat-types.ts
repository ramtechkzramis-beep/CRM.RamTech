/** Типы внутреннего чата и уведомлений — без обращений к базе. */

import type { AppRole } from "@/lib/types";

export type ConversationKind = "direct" | "department" | "group";

export type ConversationSummary = {
  id: string;
  kind: ConversationKind;
  user_a: string | null;
  user_b: string | null;
  department_id: string | null;
  department_name: string | null;
  /** Название группового чата — задаётся руководителем при создании. */
  title: string | null;
  last_message_at: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  delivered_at: string | null;
};

export type MessageStatus = "sent" | "delivered" | "read";

/**
 * Статус своего сообщения: отправлено → доставлено → прочитано.
 *
 * «Доставлено» — delivered_at проставлен браузером получателя (реально
 * получил через реалтайм или при открытии чата), «прочитано» — получатель
 * открывал этот диалог не раньше момента отправки. Сравниваем как даты,
 * а не строки: секундная точность ISO-строк от Supabase не гарантирована
 * побайтово одинаковой.
 */
export function messageStatus(
  message: Pick<ChatMessage, "created_at" | "delivered_at">,
  otherLastReadAt: string | null,
): MessageStatus {
  if (otherLastReadAt && new Date(otherLastReadAt) >= new Date(message.created_at)) {
    return "read";
  }
  if (message.delivered_at) return "delivered";
  return "sent";
}

export type DirectoryEmployee = {
  id: string;
  full_name: string;
  department_id: string | null;
  is_active: boolean;
  role: AppRole;
};

export type NotificationType = "task_assigned" | "client_reassigned";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Название чата: для личного — имя собеседника, для отдела — имя отдела,
 * для группового — название, заданное при создании.
 */
export function conversationTitle(
  conversation: ConversationSummary,
  currentUserId: string,
  profilesById: Map<string, DirectoryEmployee>,
): string {
  if (conversation.kind === "department") {
    return conversation.department_name ?? "Отдел";
  }

  if (conversation.kind === "group") {
    return conversation.title ?? "Групповой чат";
  }

  const otherId =
    conversation.user_a === currentUserId ? conversation.user_b : conversation.user_a;

  return (otherId && profilesById.get(otherId)?.full_name) || "Сотрудник";
}
