"use client";

import { Briefcase, UserCog } from "lucide-react";
import type { AppNotification } from "@/lib/chat-types";

const TYPE_ICON = {
  task_assigned: Briefcase,
  client_reassigned: UserCog,
} as const;

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffMinutes < 60 * 24) return `${Math.round(diffMinutes / 60)} ч назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ChatNotificationsPanel({
  notifications,
  onOpen,
  onMarkAllRead,
}: {
  notifications: AppNotification[];
  onOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}) {
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <span className="text-sm font-semibold text-slate-900">Уведомления</span>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            прочитать всё
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">Уведомлений нет.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const Icon = TYPE_ICON[notification.type];

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(notification)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                      notification.is_read ? "" : "bg-brand-soft/60"
                    }`}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`truncate text-sm ${
                            notification.is_read
                              ? "text-slate-600"
                              : "font-semibold text-slate-900"
                          }`}
                        >
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                        )}
                      </span>
                      {notification.body && (
                        <span className="block truncate text-xs text-slate-500">
                          {notification.body}
                        </span>
                      )}
                      <span className="block text-[11px] text-slate-400">
                        {formatWhen(notification.created_at)}
                      </span>
                    </span>
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
