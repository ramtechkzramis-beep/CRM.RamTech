import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { ChatWidget } from "@/components/chat-widget";
import { canManageUsers } from "@/lib/types";
import { getAllEmployees } from "@/lib/admin";
import { getViewAsEmployeeId } from "@/lib/view-as";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  // Список сотрудников для переключателя нужен только владельцу — обычным
  // сотрудникам и остальным руководителям лишний запрос ни к чему.
  const [viewAsEmployees, viewAsEmployeeId] = profile.can_view_as
    ? await Promise.all([getAllEmployees(), getViewAsEmployeeId()])
    : [[], null];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Меню чёрное — как фон логотипа. Рабочая область светлая:
          с таблицами работают весь день, тёмный фон под это утомляет.
          Фон уходит в фиолетовый книзу — плоская заливка выглядела мёртвой. */}
      <Sidebar
        role={profile.role}
        fullName={profile.full_name}
        canViewAs={profile.can_view_as}
        viewAsEmployees={viewAsEmployees}
        currentUserId={profile.id}
        activeEmployeeId={viewAsEmployeeId}
      />

      <main className="flex-1 overflow-x-auto px-8 py-6">
        <TopBar profileId={profile.id} />
        {children}
      </main>

      <ChatWidget
        currentUserId={profile.id}
        currentUserName={profile.full_name}
        isAdmin={canManageUsers(profile.role)}
      />
    </div>
  );
}
