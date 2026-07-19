import { createClient } from "@/lib/supabase/server";
import type { TaskOutcome, TaskType } from "@/lib/task-types";
import type { DoneAction, Employee, PlannedTask } from "@/lib/summary-types";

/** Запросы для раздела «Сводка»: что сотрудники реально сделали за период. */

/**
 * Задачи, запланированные на период, — по сроку, а не по времени закрытия.
 *
 * Это другой вопрос, чем «что человек сделал»: здесь важно, сколько стояло
 * в плане и что из этого не сделано. Задача, закрытая сегодня, но стоявшая
 * на вчера, попадёт во вчерашний план — и правильно.
 */
export async function getPlannedTasks({
  from,
  to,
  assigneeId,
}: {
  from: string;
  to: string;
  assigneeId?: string;
}): Promise<PlannedTask[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("id, status, outcome, due_date, assignee_id")
    .gte("due_date", from)
    .lte("due_date", to);

  if (assigneeId) {
    query = query.eq("assignee_id", assigneeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as PlannedTask[];
}

export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Employee[];
}

/**
 * Выполненные действия за период.
 *
 * Считаем по completed_at, а не по due_date: руководителю важно, что человек
 * сделал в этот день, а не что было на него запланировано.
 *
 * Верхнюю границу берём как «строго меньше следующего дня»: иначе действия,
 * закрытые вечером последнего дня периода, в отчёт бы не попали.
 */
export async function getDoneActions({
  from,
  to,
  assigneeId,
}: {
  from: string;
  to: string;
  assigneeId?: string;
}): Promise<DoneAction[]> {
  const supabase = await createClient();

  const toExclusive = new Date(`${to}T00:00:00`);
  toExclusive.setDate(toExclusive.getDate() + 1);

  let query = supabase
    .from("tasks")
    .select(
      "id, title, type, outcome, outcome_note, completed_at, assignee_id, client_id, client:clients(name), assignee:profiles!tasks_assignee_id_fkey(full_name)",
    )
    .eq("status", "done")
    .not("completed_at", "is", null)
    .gte("completed_at", new Date(`${from}T00:00:00`).toISOString())
    .lt("completed_at", toExclusive.toISOString())
    .order("completed_at", { ascending: false });

  if (assigneeId) {
    query = query.eq("assignee_id", assigneeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    title: string;
    type: TaskType;
    outcome: TaskOutcome | null;
    outcome_note: string | null;
    completed_at: string;
    assignee_id: string;
    client_id: string | null;
    client: { name: string } | null;
    assignee: { full_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    outcome: row.outcome,
    outcome_note: row.outcome_note,
    completed_at: row.completed_at,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee?.full_name ?? null,
    client_id: row.client_id,
    client_name: row.client?.name ?? null,
  }));
}
