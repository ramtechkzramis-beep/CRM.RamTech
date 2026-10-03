import { createClient } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/dates";
import { FOLLOW_UP_OUTCOMES } from "@/lib/task-types";

/**
 * Счётчики для бокового меню: блок «Мои задачи» и бейджи у пунктов.
 * Раньше они жили в верхней панели — по макету переехали в меню, чтобы
 * висящие задачи были видны с любого экрана, не занимая шапку.
 */
export type TaskCounters = {
  /** Все открытые задачи — бейдж у пункта «Задачи». */
  open: number;
  /** Назначено на будущие дни. */
  upcoming: number;
  /** Отложено: обещали вернуться. */
  followUp: number;
  /** Закрыто сегодня — по времени закрытия, а не по сроку. */
  doneToday: number;
};

export async function getTaskCounters(profileId: string): Promise<TaskCounters> {
  const supabase = await createClient();
  const today = todayISO();

  const [open, upcoming, followUp, doneToday] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "open"),

    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "open")
      .gt("due_date", today),

    // Смотрим за последний месяц: более старые — это уже не «отложено»,
    // а потерянный клиент.
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "done")
      .in("outcome", FOLLOW_UP_OUTCOMES)
      .gte("due_date", addDaysISO(today, -30)),

    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profileId)
      .eq("status", "done")
      .gte("completed_at", new Date(`${today}T00:00:00`).toISOString())
      .lt("completed_at", new Date(`${addDaysISO(today, 1)}T00:00:00`).toISOString()),
  ]);

  return {
    open: open.count ?? 0,
    upcoming: upcoming.count ?? 0,
    followUp: followUp.count ?? 0,
    doneToday: doneToday.count ?? 0,
  };
}

/** Размер холодной базы — бейдж в меню. */
export async function getColdClientsCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "cold");

  return count ?? 0;
}
