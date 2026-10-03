"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Snowflake,
  Flame,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import type { AppRole } from "@/lib/types";
import { canManageUsers, canSeeDashboard } from "@/lib/types";

const ICONS = {
  today: CalendarCheck,
  cold: Snowflake,
  warm: Flame,
  active: Users,
  summary: ClipboardList,
  dashboard: BarChart3,
  admin: Settings,
  knowledge: BookOpen,
} as const;

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Число справа от пункта: открытые задачи, размер холодной базы. */
  badge?: number;
};

function formatBadge(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function Nav({
  role,
  collapsed = false,
  openTasks = 0,
  coldClients = 0,
}: {
  role: AppRole;
  collapsed?: boolean;
  openTasks?: number;
  coldClients?: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/today", label: "Задачи", icon: "today", badge: openTasks },
    { href: "/clients/cold", label: "Холодная база", icon: "cold", badge: coldClients },
    { href: "/clients/warm", label: "Наработки", icon: "warm" },
    { href: "/clients/active", label: "Текущие клиенты", icon: "active" },
  ];

  if (canSeeDashboard(role)) {
    items.push({ href: "/summary", label: "Сводка", icon: "summary" });
    items.push({ href: "/dashboard", label: "Дашборд", icon: "dashboard" });
  }

  // Открыта всем сотрудникам, а не только руководству: любой должен
  // в любой момент напомнить себе скрипты продаж или инструкции по ботам.
  items.push({ href: "/knowledge", label: "База знаний", icon: "knowledge" });

  if (canManageUsers(role)) {
    items.push({ href: "/admin", label: "Сотрудники", icon: "admin" });
  }

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              collapsed ? "justify-center px-0" : ""
            } ${
              isActive
                ? "bg-sidebar-hover font-medium text-white"
                : "text-sidebar-text hover:bg-sidebar-hover/60 hover:text-white"
            }`}
          >
            <Icon className="size-[18px] shrink-0" />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {/* Бейдж у активного пункта — фиолетовой плашкой, у остальных
                    просто цифрой: иначе меню рябит от плашек. */}
                {!!item.badge && (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                      isActive ? "bg-brand text-white" : "text-sidebar-muted"
                    }`}
                  >
                    {formatBadge(item.badge)}
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
