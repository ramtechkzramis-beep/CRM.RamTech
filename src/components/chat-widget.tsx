"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, MessagesSquare, Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatConversationList } from "@/components/chat-conversation-list";
import { ChatThread } from "@/components/chat-thread";
import { ChatNewDm } from "@/components/chat-new-dm";
import { ChatNewGroup } from "@/components/chat-new-group";
import { ChatManageMembers } from "@/components/chat-manage-members";
import { ChatNotificationsPanel } from "@/components/chat-notifications-panel";
import type {
  AppNotification,
  ChatMessage,
  ConversationSummary,
  DirectoryEmployee,
} from "@/lib/chat-types";
import { conversationTitle } from "@/lib/chat-types";

type Tab = "chats" | "notifications";
type View = "list" | "thread" | "new-dm" | "new-group" | "manage-members";

/**
 * Плавающий виджет чата и уведомлений — общий для всех страниц (app),
 * поэтому живёт в (app)/layout.tsx, а не на отдельной странице.
 *
 * Данные держит сам компонент и обновляет через Supabase Realtime: список
 * чатов — это RLS-видимая выборка, лишнего сервер-экшена под неё заводить
 * незачем.
 */
export function ChatWidget({
  currentUserId,
  currentUserName,
  isAdmin,
}: {
  currentUserId: string;
  currentUserName: string;
  /** Создавать групповые чаты и управлять составом может только руководитель. */
  isAdmin: boolean;
}) {
  const router = useRouter();
  // Один клиент на весь жизненный цикл виджета: без этого createClient()
  // пересоздавал бы соединение на каждый ре-рендер, а он тут частый.
  const [supabase] = useState(() => createClient());

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chats");
  const [view, setView] = useState<View>("list");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [directory, setDirectory] = useState<DirectoryEmployee[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Когда собеседник последний раз читал открытый диалог — нужно, чтобы
  // галочки «прочитано» у своих сообщений переключались вживую.
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  // Состав группового чата — грузим только при входе в управление участниками,
  // не при каждом открытии чата.
  const [groupMembers, setGroupMembers] = useState<DirectoryEmployee[]>([]);

  // Реалтайм-обработчик подписывается один раз при монтировании и держит
  // тот же замкнутый снимок состояния — активный чат читаем через ref,
  // иначе колбэк видел бы устаревшее значение.
  const activeConversationRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const profilesById = new Map(directory.map((e) => [e.id, e]));

  async function refreshConversations() {
    const { data } = await supabase
      .from("conversation_summaries")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    setConversations((data ?? []) as ConversationSummary[]);
  }

  async function refreshDirectory() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, department_id, is_active, role")
      .eq("is_active", true)
      .neq("id", currentUserId)
      .order("full_name");

    setDirectory((data ?? []) as DirectoryEmployee[]);
  }

  async function refreshNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications((data ?? []) as AppNotification[]);
  }

  useEffect(() => {
    // IIFE, а не прямой вызов: setState должен происходить внутри вложенного
    // колбэка, а не первой строкой тела эффекта — иначе это те же каскадные
    // рендеры, которых правило и остерегается.
    void (async () => {
      await Promise.all([refreshConversations(), refreshDirectory(), refreshNotifications()]);
    })();

    const channel = supabase
      .channel("chat-widget")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as ChatMessage;

          if (message.conversation_id === activeConversationRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === message.id) ? prev : [...prev, message],
            );
            // Сообщение пришло в открытый чат — сразу отмечаем прочитанным,
            // иначе счётчик небольшого чата будет расти, пока смотришь на него.
            supabase
              .from("conversation_reads")
              .upsert(
                { conversation_id: message.conversation_id, user_id: currentUserId, last_read_at: new Date().toISOString() },
                { onConflict: "conversation_id,user_id" },
              )
              .then(() => {});
          }

          // Моё браузерное окно реально получило сообщение прямо сейчас —
          // это и есть честное «доставлено», а не выдумка ради галочки.
          if (message.sender_id !== currentUserId) {
            supabase.rpc("mark_conversation_delivered", {
              p_conversation_id: message.conversation_id,
            });
          }

          refreshConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const notification = payload.new as AppNotification;
          setNotifications((prev) => [notification, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => refreshConversations(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_reads" },
        (payload) => {
          const row = payload.new as { conversation_id: string; user_id: string; last_read_at: string };

          // Собеседник открыл диалог, который сейчас смотрю я, — переключаем
          // галочки на «прочитано» без перезагрузки.
          if (
            row.conversation_id === activeConversationRef.current &&
            row.user_id !== currentUserId
          ) {
            setOtherLastReadAt(row.last_read_at);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setView("thread");
    setOtherLastReadAt(null);

    const [{ data: messageRows }, { data: readRows }] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("conversation_reads")
        .select("user_id, last_read_at")
        .eq("conversation_id", conversationId),
    ]);

    setMessages((messageRows ?? []) as ChatMessage[]);

    const otherRead = (readRows ?? []).find((r) => r.user_id !== currentUserId);
    setOtherLastReadAt((otherRead?.last_read_at as string | undefined) ?? null);

    await supabase.from("conversation_reads").upsert(
      {
        conversation_id: conversationId,
        user_id: currentUserId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" },
    );

    // Заодно подтверждаем доставку того, что накопилось, пока чат был закрыт —
    // без этого сообщения, полученные не вживую, остались бы без галочки.
    await supabase.rpc("mark_conversation_delivered", {
      p_conversation_id: conversationId,
    });

    // Обнуляем счётчик локально, не дожидаясь пересчёта с сервера —
    // иначе бейдж моргнёт «непрочитано» ещё секунду после открытия чата.
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
    );
  }

  async function startDirectChat(otherId: string) {
    const [userA, userB] = [currentUserId, otherId].sort();

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("kind", "direct")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ kind: "direct", user_a: userA, user_b: userB })
        .select("id")
        .single();

      if (error || !created) return;
      conversationId = created.id as string;
      await refreshConversations();
    }

    await openConversation(conversationId);
  }

  /** Возвращает сообщение об ошибке для формы или null при успехе. */
  async function startGroupChat(title: string, memberIds: string[]): Promise<string | null> {
    const { data, error } = await supabase.rpc("create_group_chat", {
      p_title: title,
      p_member_ids: memberIds,
    });

    if (error || !data) {
      return error?.message ?? "Не удалось создать чат";
    }

    await refreshConversations();
    await openConversation(data as string);
    return null;
  }

  async function openManageMembers() {
    if (!activeConversationId) return;
    setView("manage-members");

    // Явно указываем внешний ключ: у conversation_members два FK на profiles
    // (user_id и added_by), без уточнения PostgREST не поймёт, какой брать.
    const { data } = await supabase
      .from("conversation_members")
      .select(
        "profiles!conversation_members_user_id_fkey(id, full_name, department_id, is_active, role)",
      )
      .eq("conversation_id", activeConversationId);

    const members = ((data ?? []) as unknown as { profiles: DirectoryEmployee }[])
      .map((row) => row.profiles)
      .filter(Boolean);

    setGroupMembers(members);
  }

  async function addGroupMember(employeeId: string) {
    if (!activeConversationId) return;

    await supabase.from("conversation_members").insert({
      conversation_id: activeConversationId,
      user_id: employeeId,
      added_by: currentUserId,
    });

    await openManageMembers();
  }

  async function removeGroupMember(employeeId: string) {
    if (!activeConversationId) return;

    setGroupMembers((prev) => prev.filter((m) => m.id !== employeeId));
    await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", activeConversationId)
      .eq("user_id", employeeId);
  }

  async function sendMessage(body: string) {
    if (!activeConversationId) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: activeConversationId, sender_id: currentUserId, body })
      .select("*")
      .single();

    if (error || !data) return;

    const message = data as ChatMessage;
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    refreshConversations();
  }

  async function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
    }

    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  const unreadMessages = conversations.reduce((acc, c) => acc + c.unread_count, 0);
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const totalUnread = unreadMessages + unreadNotifications;

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-[32rem] w-96 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Закрытие — маленькая кнопка сверху слева, а не отдельная большая
              круглая внизу: круглая кнопка пока панель открыта не нужна вовсе. */}
          <div className="flex items-center border-b border-slate-100 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Свернуть чат"
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
          </div>

          {view === "list" && (
            <>
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setTab("chats")}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition ${
                    tab === "chats"
                      ? "border-b-2 border-brand text-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <MessagesSquare className="size-4" />
                  Чаты
                  {unreadMessages > 0 && (
                    <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("notifications")}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition ${
                    tab === "notifications"
                      ? "border-b-2 border-brand text-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Bell className="size-4" />
                  Уведомления
                  {unreadNotifications > 0 && (
                    <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>

              <div className="min-h-0 flex-1">
                {tab === "chats" ? (
                  <ChatConversationList
                    conversations={conversations}
                    currentUserId={currentUserId}
                    profilesById={profilesById}
                    canCreateGroup={isAdmin}
                    onOpen={openConversation}
                    onNewDm={() => setView("new-dm")}
                    onNewGroup={() => setView("new-group")}
                  />
                ) : (
                  <ChatNotificationsPanel
                    notifications={notifications}
                    onOpen={openNotification}
                    onMarkAllRead={markAllNotificationsRead}
                  />
                )}
              </div>
            </>
          )}

          {view === "thread" && activeConversation && (
            <ChatThread
              title={conversationTitle(activeConversation, currentUserId, profilesById)}
              isGroup={activeConversation.kind !== "direct"}
              messages={messages}
              currentUserId={currentUserId}
              profilesById={profilesById}
              otherLastReadAt={otherLastReadAt}
              headerAction={
                isAdmin && activeConversation.kind === "group" ? (
                  <button
                    type="button"
                    onClick={openManageMembers}
                    aria-label="Участники чата"
                    title="Участники чата"
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Settings className="size-4" />
                  </button>
                ) : undefined
              }
              onBack={() => setView("list")}
              onSend={sendMessage}
            />
          )}

          {view === "new-dm" && (
            <ChatNewDm
              employees={directory}
              onBack={() => setView("list")}
              onSelect={startDirectChat}
            />
          )}

          {view === "new-group" && (
            <ChatNewGroup
              employees={directory}
              onBack={() => setView("list")}
              onCreate={startGroupChat}
            />
          )}

          {view === "manage-members" && activeConversation && (
            <ChatManageMembers
              title={conversationTitle(activeConversation, currentUserId, profilesById)}
              members={groupMembers}
              employees={directory}
              onBack={() => setView("thread")}
              onAdd={addGroupMember}
              onRemove={removeGroupMember}
            />
          )}
        </div>
      )}

      {/* Пока панель открыта, круглая кнопка прячется — закрывает чат
          маленький крестик сверху слева внутри самой панели, не нужно
          два разных способа закрыть окно одновременно. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть чат"
          title={currentUserName}
          className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
        >
          <MessageCircle className="size-6" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
