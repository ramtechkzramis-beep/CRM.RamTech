"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Nav } from "@/components/nav";
import { Logo } from "@/components/logo";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import { signOut } from "@/app/login/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import type { EmployeeWithDepartment } from "@/lib/admin";

const STORAGE_KEY = "sidebar_collapsed";

/**
 * Сайдбар со сворачиванием — стрелка в правом верхнем углу панели.
 * Состояние держим в localStorage: это удобство конкретного устройства,
 * а не данные, которые нужно синхронизировать между сотрудниками.
 */
export function Sidebar({
  role,
  fullName,
  canViewAs,
  viewAsEmployees,
  currentUserId,
  activeEmployeeId,
}: {
  role: AppRole;
  fullName: string;
  canViewAs: boolean;
  viewAsEmployees: EmployeeWithDepartment[];
  currentUserId: string;
  activeEmployeeId: string | null;
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
      className={`relative flex shrink-0 flex-col border-r border-sidebar-border bg-gradient-to-b from-sidebar via-sidebar to-[#150f24] py-6 transition-all ${
        collapsed ? "w-20 px-2" : "w-64 px-4"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
        title={collapsed ? "Развернуть панель" : "Свернуть панель"}
        className="absolute -right-3 top-6 z-10 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-slate-300 shadow-md transition hover:bg-sidebar-hover hover:text-white"
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      <div className={`pb-7 ${collapsed ? "px-0" : "px-2"}`}>
        <Logo compact={collapsed} />
      </div>

      <Nav role={role} collapsed={collapsed} />

      <div className="mt-auto border-t border-sidebar-border pt-4">
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
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-semibold text-white"
          >
            {fullName.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{fullName}</p>
              <p className="truncate text-xs text-slate-400">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>

        <form action={signOut} className="mt-3">
          <button
            type="submit"
            title={collapsed ? "Выйти" : undefined}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:bg-sidebar-hover hover:text-white ${
              collapsed ? "justify-center" : "text-left"
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && "Выйти"}
          </button>
        </form>
      </div>
    </aside>
  );
}
