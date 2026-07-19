import { requireProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { TopBar } from "@/components/top-bar";
import { Logo } from "@/components/logo";
import { ChatWidget } from "@/components/chat-widget";
import { ROLE_LABELS, canManageUsers } from "@/lib/types";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Меню чёрное — как фон логотипа. Рабочая область светлая:
          с таблицами работают весь день, тёмный фон под это утомляет.
          Фон уходит в фиолетовый книзу — плоская заливка выглядела мёртвой. */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-gradient-to-b from-sidebar via-sidebar to-[#150f24] px-4 py-6">
        <div className="px-2 pb-7">
          <Logo />
        </div>

        <Nav role={profile.role} />

        <div className="mt-auto border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2.5 px-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-semibold text-white">
              {profile.full_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-slate-400">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
          </div>

          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-400 transition hover:bg-sidebar-hover hover:text-white"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>

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
