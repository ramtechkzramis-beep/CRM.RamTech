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

  // Сотрудника берём из уже загруженного списка, а не отдельным запросом.
  // Если в cookie остался тот, кого уже удалили, find вернёт undefined —
  // и всё честно покажет ваш собственный экран.
  const viewedEmployee = viewAsEmployeeId
    ? (viewAsEmployees.find((employee) => employee.id === viewAsEmployeeId) ?? null)
    : null;

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
        {/* В режиме просмотра счётчики считаем по сотруднику: иначе рядом
            с его пустым днём висели бы ваши собственные просрочки. */}
        <TopBar
          profileId={viewedEmployee?.id ?? profile.id}
          viewedName={viewedEmployee?.full_name ?? null}
        />
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
