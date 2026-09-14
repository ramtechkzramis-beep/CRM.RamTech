import { createClient } from "@/lib/supabase/server";
import type { TaskOutcome, TaskType } from "@/lib/task-types";
import type {
  DoneAction,
  Employee,
  PlannedTask,
  WarmEvent,
  WarmEventKind,
} from "@/lib/summary-types";

/** Запросы для раздела «Сводка»: что сотрудники реально сделали за период. */

/**
 * Решения по наработкам за период: оформили, отказались, перенесли ответ.
 *
 * Фильтр по сотруднику — по ответственному за компанию на момент решения
 * (owner_id в журнале): это результат менеджера, даже если кнопку нажал
 * руководитель. Границы периода — как в getDoneActions.
 */
export async function getWarmEvents({
  from,
  to,
  ownerId,
}: {
  from: string;
  to: string;
  ownerId?: string;
}): Promise<WarmEvent[]> {
  const supabase = await createClient();

  const toExclusive = new Date(`${to}T00:00:00`);
  toExclusive.setDate(toExclusive.getDate() + 1);

  let query = supabase
    .from("warm_events")
    .select(
      "id, kind, client_id, owner_id, note, previous_response_date, new_response_date, created_at, client:clients(name), owner:profiles!warm_events_owner_id_fkey(full_name)",
    )
    .gte("created_at", new Date(`${from}T00:00:00`).toISOString())
    .lt("created_at", toExclusive.toISOString())
    .order("created_at", { ascending: false });

  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    kind: WarmEventKind;
    client_id: string;
    owner_id: string | null;
    note: string | null;
    previous_response_date: string | null;
    new_response_date: string | null;
    created_at: string;
    client: { name: string } | null;
    owner: { full_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    client_id: row.client_id,
    client_name: row.client?.name ?? null,
    owner_id: row.owner_id,
    owner_name: row.owner?.full_name ?? null,
    note: row.note,
    previous_response_date: row.previous_response_date,
    new_response_date: row.new_response_date,
    created_at: row.created_at,
  }));
}

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
