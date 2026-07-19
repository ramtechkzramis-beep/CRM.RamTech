import type { TaskOutcome, TaskType } from "@/lib/task-types";
import { OUTCOME_TONE, TASK_TYPES } from "@/lib/task-types";

/** Типы и подсчёты для сводки — без обращений к базе (нужны и формам фильтров). */

export type Employee = { id: string; full_name: string };

export type DoneAction = {
  id: string;
  title: string;
  type: TaskType;
  outcome: TaskOutcome | null;
  outcome_note: string | null;
  completed_at: string;
  assignee_id: string;
  assignee_name: string | null;
  client_id: string | null;
  client_name: string | null;
};

export type SummaryTotals = Record<TaskType, number> & { total: number };

/** Задача, запланированная на период, — для оценки выполнения плана. */
export type PlannedTask = {
  id: string;
  status: "open" | "done";
  outcome: TaskOutcome | null;
  due_date: string;
  assignee_id: string;
};

export type PlanStats = {
  /** Сколько задач стояло в плане на период. */
  planned: number;
  /** Закрыты с нормальным исходом. */
  completed: number;
  /** Закрыты неудачно: отказ, отмена, не пришли. */
  cancelled: number;
  /** Так и не закрыты. */
  pending: number;
  /**
   * Доля выполненных от запланированных, 0–100.
   * null, если планов не было: делить не на что, а 0% соврал бы.
   */
  rate: number | null;
};

export function planStatsFor(tasks: PlannedTask[]): PlanStats {
  let completed = 0;
  let cancelled = 0;
  let pending = 0;

  for (const task of tasks) {
    if (task.status === "open") {
      pending += 1;
    } else if (task.outcome && OUTCOME_TONE[task.outcome] === "bad") {
      cancelled += 1;
    } else {
      completed += 1;
    }
  }

  const planned = tasks.length;

  return {
    planned,
    completed,
    cancelled,
    pending,
    // Считаем от всего плана: сорванная встреча — тоже невыполненный план,
    // иначе коэффициент льстил бы, пряча отказы.
    rate: planned === 0 ? null : Math.round((completed / planned) * 100),
  };
}

export function emptyTotals(): SummaryTotals {
  const totals = Object.fromEntries(TASK_TYPES.map((type) => [type, 0])) as SummaryTotals;
  totals.total = 0;
  return totals;
}

export function totalsFor(actions: DoneAction[]): SummaryTotals {
  const totals = emptyTotals();

  for (const action of actions) {
    totals[action.type] += 1;
    totals.total += 1;
  }

  return totals;
}

/** Разбивка по сотрудникам — когда смотрим сразу всех. */
export function byEmployee(actions: DoneAction[]) {
  const map = new Map<string, { name: string; totals: SummaryTotals }>();

  for (const action of actions) {
    if (!map.has(action.assignee_id)) {
      map.set(action.assignee_id, {
        name: action.assignee_name ?? "Без имени",
        totals: emptyTotals(),
      });
    }

    const entry = map.get(action.assignee_id)!;
    entry.totals[action.type] += 1;
    entry.totals.total += 1;
  }

  return [...map.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.totals.total - a.totals.total);
}
