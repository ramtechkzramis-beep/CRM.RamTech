import { createClient } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/dates";
import { FOLLOW_UP_OUTCOMES, type DayTasks, type TaskWithRelations } from "@/lib/task-types";

const TASK_SELECT =
  "*, client:clients(id, name, status, cycle_start_date, contract_months, loyalty), assignee:profiles!tasks_assignee_id_fkey(full_name), contact:client_contacts(id, full_name, phone)";

/**
 * Задачи вокруг выбранного дня: просроченные, на сам день, на следующий.
 * Кто их увидит, решает RLS — здесь фильтруем только по датам.
 *
 * Просроченные показываем только когда смотрим сегодняшний день: листая план
 * на будущее, видеть вчерашние хвосты незачем — они мешают планировать.
 *
 * includeDone добавляет уже закрытые задачи текущего дня. Нужно там, где
 * показываем состояние дня целиком («сделано 2 из 5»): без них счётчики
 * расходятся с тем, что человек видит в списке.
 */
export async function getDayTasks(
  assigneeId?: string,
  dateISO: string = todayISO(),
  { includeDone = false }: { includeDone?: boolean } = {},
): Promise<DayTasks> {
  const supabase = await createClient();
  const nextDay = addDaysISO(dateISO, 1);
  const isToday = dateISO === todayISO();

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .lte("due_date", nextDay)
    .order("due_date", { ascending: true })
    .order("status", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (!includeDone) {
    query = query.eq("status", "open");
  }

  if (assigneeId) {
    query = query.eq("assignee_id", assigneeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tasks = (data ?? []) as TaskWithRelations[];
  const isOpen = (t: TaskWithRelations) => t.status === "open";

  return {
    // Закрытая вчерашняя задача — не просрочка, она сделана.
    overdue: isToday ? tasks.filter((t) => t.due_date < dateISO && isOpen(t)) : [],
    today: tasks.filter((t) => t.due_date === dateISO),
    // На завтра закрытых задач обычно нет, но если есть — это план, а не отчёт.
    tomorrow: tasks.filter((t) => t.due_date === nextDay && isOpen(t)),
  };
}

/**
 * Все задачи за конкретный день, включая закрытые.
 * Нужно, чтобы можно было заглянуть в прошедший день и увидеть, что было
 * запланировано и чем закончилось.
 */
export async function getTasksForDate(
  dateISO: string,
  assigneeId?: string,
): Promise<TaskWithRelations[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("due_date", dateISO)
    .order("status", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (assigneeId) {
    query = query.eq("assignee_id", assigneeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

/**
 * Все задачи компании — открытые и закрытые, любого исполнителя.
 * В отличие от «Истории работы» (только закрытые), тут виден весь план:
 * что запланировано, что уже сделано, что отменилось.
 */
export async function getClientTasks(clientId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("client_id", clientId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

/**
 * История работы с компанией: что по ней уже сделали, кто и когда.
 * Только закрытые задачи и по времени закрытия — это летопись контактов,
 * а не план. Открытые задачи — см. getClientTasks.
 */
export async function getClientHistory(
  clientId: string,
  limit = 50,
): Promise<TaskWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("client_id", clientId)
    .eq("status", "done")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

/**
 * Весь план на будущее — не один конкретный день, а все открытые задачи
 * позже сегодняшнего. Чип «Назначено» в шапке считает именно это, поэтому
 * список должен совпадать, а не показывать один день (например, «завтра»).
 */
export async function getUpcomingTasks(assigneeId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const today = todayISO();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("assignee_id", assigneeId)
    .eq("status", "open")
    .gt("due_date", today)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

/**
 * Закрытые дела, к которым обещали вернуться: перезвонить, перенесённая
 * встреча, отсрочка платежа. Последние 30 дней — старше уже не «отложено»,
 * а фактически потерянный контакт.
 */
export async function getFollowUpTasks(assigneeId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const today = todayISO();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("assignee_id", assigneeId)
    .eq("status", "done")
    .in("outcome", FOLLOW_UP_OUTCOMES)
    .gte("due_date", addDaysISO(today, -30))
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

