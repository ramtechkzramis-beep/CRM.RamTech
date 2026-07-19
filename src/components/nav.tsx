"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Snowflake,
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
};

export function Nav({ role }: { role: AppRole }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/today", label: "Задачи на сегодня", icon: "today" },
    { href: "/clients/cold", label: "Холодная база", icon: "cold" },
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? "bg-gradient-to-r from-brand to-brand-dark font-medium text-white shadow-lg shadow-brand/25"
                : "text-slate-400 hover:bg-sidebar-hover hover:text-white"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
