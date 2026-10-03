import { Sidebar } from "@/components/sidebar";
import { ChatWidget } from "@/components/chat-widget";
import { canManageUsers } from "@/lib/types";
import { getAllEmployees } from "@/lib/admin";
import { getTaskScreenTarget, getViewAsEmployeeId } from "@/lib/view-as";
import { getColdClientsCount, getTaskCounters } from "@/lib/task-counters";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, employee: viewedEmployee, targetId } = await getTaskScreenTarget();

  // Список сотрудников для переключателя нужен только владельцу — обычным
  // сотрудникам и остальным руководителям лишний запрос ни к чему.
  const [viewAsEmployees, viewAsEmployeeId] = profile.can_view_as
    ? await Promise.all([getAllEmployees(), getViewAsEmployeeId()])
    : [[], null];

  // В режиме просмотра счётчики считаем по сотруднику: иначе рядом с его
  // пустым днём висели бы ваши собственные просрочки.
  const [counters, coldClients] = await Promise.all([
    getTaskCounters(targetId),
    getColdClientsCount(),
  ]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Меню почти чёрное — как фон логотипа. Рабочая область светлая:
          с таблицами работают весь день, тёмный фон под это утомляет. */}
      <Sidebar
        role={profile.role}
        fullName={profile.full_name}
        canViewAs={profile.can_view_as}
        viewAsEmployees={viewAsEmployees}
        currentUserId={profile.id}
        activeEmployeeId={viewAsEmployeeId}
        counters={counters}
        coldClients={coldClients}
        viewedName={viewedEmployee?.full_name ?? null}
      />

      <main className="flex-1 overflow-x-auto px-8 py-7">{children}</main>

      <ChatWidget
        currentUserId={profile.id}
        currentUserName={profile.full_name}
        isAdmin={canManageUsers(profile.role)}
      />
    </div>
  );
}
