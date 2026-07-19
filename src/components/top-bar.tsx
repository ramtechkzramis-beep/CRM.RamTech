import Link from "next/link";
import { AlertTriangle, RotateCcw, CalendarClock, CheckCircle2, ListTodo } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { TaskOutcome } from "@/lib/task-types";

/**
 * Исходы, после которых работа с клиентом не закончена: обещали перезвонить,
 * перенесли встречу, дали отсрочку. Формально задача закрыта, но клиент ждёт —
 * без отдельного счётчика такие висят незамеченными.
 */
const FOLLOW_UP_OUTCOMES: TaskOutcome[] = [
  "call_callback",
  "meeting_rescheduled",
  "payment_deferred",
  "service_postponed",
];

async function getCounters(profileId: string) {
  const supabase = await createClient();
  const today = todayISO();

  const [overdue, todayTasks, upcoming, followUp] = await Promise.all([
    // Висит с прошлых дней.
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "open")
      .lt("due_date", today),

    // Весь сегодняшний день — и открытые, и закрытые: нужен прогресс «2 из 5».
    supabase
      .from("tasks")
      .select("status")
      .eq("assignee_id", profileId)
      .eq("due_date", today),

    // План на будущее.
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "open")
      .gt("due_date", today),

    // Обещания, к которым надо вернуться. Смотрим за последний месяц:
    // более старые — это уже не «отложено», а потерянный клиент.
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "done")
      .in("outcome", FOLLOW_UP_OUTCOMES)
      .gte("due_date", addDaysISO(today, -30)),
  ]);

  const todayRows = todayTasks.data ?? [];

  return {
    overdue: overdue.count ?? 0,
    todayTotal: todayRows.length,
    todayDone: todayRows.filter((t) => t.status === "done").length,
    upcoming: upcoming.count ?? 0,
    followUp: followUp.count ?? 0,
  };
}

function Chip({
  href,
  title,
  icon,
  label,
  tone,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  label: string;
  tone: "danger" | "warning" | "info" | "muted" | "success";
}) {
  const styles = {
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    info: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    muted: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  }[tone];

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${styles}`}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Верхняя панель со значками состояния.
 * Висящие задачи должны попадаться на глаза с любого экрана, а не ждать,
 * пока сотрудник сам заглянет в раздел задач.
 */
export async function TopBar({ profileId }: { profileId: string }) {
  const counters = await getCounters(profileId);
  const yesterday = addDaysISO(todayISO(), -1);
  const tomorrow = addDaysISO(todayISO(), 1);

  const allDone = counters.todayTotal > 0 && counters.todayDone === counters.todayTotal;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      {/* Показываем только то, что есть: пустые нули — визуальный шум. */}
      {counters.overdue > 0 && (
        <Chip
          href={`/today?date=${yesterday}`}
          title={`${counters.overdue} задач висит с прошлых дней`}
          icon={<AlertTriangle className="size-4" />}
          label={`Просрочено: ${counters.overdue}`}
          tone="danger"
        />
      )}

      {counters.followUp > 0 && (
        <Chip
          href="/today"
          title="Обещали перезвонить, перенесли встречу или дали отсрочку — к этим клиентам нужно вернуться"
          icon={<RotateCcw className="size-4" />}
          label={`Отложено: ${counters.followUp}`}
          tone="warning"
        />
      )}

      {counters.upcoming > 0 && (
        <Chip
          href={`/today?date=${tomorrow}`}
          title={`${counters.upcoming} задач запланировано на будущие дни`}
          icon={<CalendarClock className="size-4" />}
          label={`Назначено: ${counters.upcoming}`}
          tone="info"
        />
      )}

      {counters.todayTotal > 0 ? (
        <Chip
          href="/today"
          title="Задачи на сегодня"
          icon={
            allDone ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
            )
          }
          label={`Сегодня: ${counters.todayDone} из ${counters.todayTotal}`}
          tone={allDone ? "success" : "muted"}
        />
      ) : (
        <Chip
          href="/today"
          title="На сегодня задач нет"
          icon={<ListTodo className="size-4" />}
          label="На сегодня пусто"
          tone="muted"
        />
      )}
    </div>
  );
}
