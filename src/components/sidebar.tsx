"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Nav } from "@/components/nav";
import { Logo } from "@/components/logo";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import { signOut } from "@/app/login/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import type { EmployeeWithDepartment } from "@/lib/admin";
import type { TaskCounters } from "@/lib/task-counters";

const STORAGE_KEY = "sidebar_collapsed";

/** Строки блока «Мои задачи»: куда ведут и каким цветом помечены. */
const MY_TASKS_ROWS = [
  { key: "upcoming", href: "/today/upcoming", label: "Назначено", dot: "bg-indigo-400" },
  { key: "followUp", href: "/today/follow-up", label: "Отложено", dot: "bg-amber-400" },
  { key: "doneToday", href: "/today/history", label: "Выполнено", dot: "bg-emerald-400" },
] as const;

/**
 * Сайдбар со сворачиванием — стрелка в правом верхнем углу панели.
 * Состояние держим в localStorage: это удобство конкретного устройства,
 * а не данные, которые нужно синхронизировать между сотрудниками.
 *
 * Блок «Мои задачи» — те же счётчики, что раньше висели в шапке. В режиме
 * просмотра за сотрудника показывает его цифры, а не ваши.
 */
export function Sidebar({
  role,
  fullName,
  canViewAs,
  viewAsEmployees,
  currentUserId,
  activeEmployeeId,
  counters,
  coldClients,
  viewedName,
}: {
  role: AppRole;
  fullName: string;
  canViewAs: boolean;
  viewAsEmployees: EmployeeWithDepartment[];
  currentUserId: string;
  activeEmployeeId: string | null;
  counters: TaskCounters;
  coldClients: number;
  viewedName: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Приватный режим или запрет на storage — остаёмся развёрнутыми.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Не страшно — просто не запомнится до следующей перезагрузки.
      }
      return next;
    });
  }

  return (
    <aside
      className={`relative flex shrink-0 flex-col bg-sidebar py-6 transition-all ${
        collapsed ? "w-20 px-2" : "w-60 px-4"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
        title={collapsed ? "Развернуть панель" : "Свернуть панель"}
        className="absolute -right-3 top-6 z-10 flex size-6 items-center justify-center rounded-full border-2 border-brand bg-sidebar text-brand-light shadow-md shadow-brand/40 transition hover:bg-brand hover:text-white"
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      <div className={`pb-7 ${collapsed ? "px-0" : "px-2"}`}>
        <Logo compact={collapsed} />
      </div>

      <Nav
        role={role}
        collapsed={collapsed}
        openTasks={counters.open}
        coldClients={coldClients}
      />

      {!collapsed && (
        <div className="mt-6 rounded-2xl bg-sidebar-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-sidebar-muted">
            {viewedName ? `Задачи · ${viewedName}` : "Мои задачи"}
          </p>

          <div className="mt-3 space-y-2.5">
            {MY_TASKS_ROWS.map((row) => (
              <Link
                key={row.key}
                href={row.href}
                className="flex items-center gap-2.5 text-sm text-sidebar-text transition hover:text-white"
              >
                <span className={`size-1.5 shrink-0 rounded-full ${row.dot}`} />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="shrink-0 font-semibold text-white">{counters[row.key]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6">
        {canViewAs && !collapsed && (
          <ViewAsSwitcher
            employees={viewAsEmployees}
            currentUserId={currentUserId}
            activeEmployeeId={activeEmployeeId}
          />
        )}

        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center px-0" : "px-2"}`}>
          <span
            title={collapsed ? fullName : undefined}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-hover text-sm font-semibold text-white"
          >
            {fullName.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{fullName}</p>
                <p className="truncate text-xs text-sidebar-muted">{ROLE_LABELS[role]}</p>
              </div>
              <form action={signOut} className="ml-auto">
                <button
                  type="submit"
                  title="Выйти"
                  aria-label="Выйти"
                  className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted transition hover:bg-sidebar-hover hover:text-white"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </>
          )}
        </div>

        {collapsed && (
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              title="Выйти"
              className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm text-sidebar-muted transition hover:bg-sidebar-hover hover:text-white"
            >
              <LogOut className="size-4 shrink-0" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
