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

/** Решение по наработке — строка журнала warm_events. */
export type WarmEventKind = "signed" | "refused" | "postponed";

export const WARM_EVENT_KINDS: WarmEventKind[] = ["signed", "refused", "postponed"];

export const WARM_EVENT_LABELS: Record<WarmEventKind, string> = {
  signed: "Оформлено",
  refused: "Отказ",
  postponed: "Перенос",
};

export const WARM_EVENT_STYLES: Record<WarmEventKind, string> = {
  signed: "bg-emerald-100 text-emerald-800",
  refused: "bg-red-100 text-red-800",
  postponed: "bg-amber-100 text-amber-800",
};

export type WarmEvent = {
  id: string;
  kind: WarmEventKind;
  client_id: string;
  client_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  note: string | null;
  previous_response_date: string | null;
  new_response_date: string | null;
  created_at: string;
};

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

/** Строка «По сотрудникам» в сводке: сколько сделал и чем это кончилось. */
export type EmployeeBreakdown = {
  id: string;
  name: string;
  total: number;
  /** Доли для полосы: удачно / промежуточно / неудачно. */
  good: number;
  neutral: number;
  bad: number;
  /** Исходы с количеством — расшифровка под полосой. */
  outcomes: { outcome: TaskOutcome; count: number }[];
};

/**
 * Разбивка по сотрудникам с исходами, а не только по типам задач:
 * руководителю важно не «5 встреч», а сколько из них проведено,
 * перенесено и сорвано.
 */
export function employeeBreakdown(actions: DoneAction[]): EmployeeBreakdown[] {
  const map = new Map<string, EmployeeBreakdown & { counts: Map<TaskOutcome, number> }>();

  for (const action of actions) {
    if (!map.has(action.assignee_id)) {
      map.set(action.assignee_id, {
        id: action.assignee_id,
        name: action.assignee_name ?? "Без имени",
        total: 0,
        good: 0,
        neutral: 0,
        bad: 0,
        outcomes: [],
        counts: new Map(),
      });
    }

    const row = map.get(action.assignee_id)!;
    row.total += 1;

    if (action.outcome) {
      row.counts.set(action.outcome, (row.counts.get(action.outcome) ?? 0) + 1);
      const tone = OUTCOME_TONE[action.outcome];
      if (tone === "good") row.good += 1;
      else if (tone === "bad") row.bad += 1;
      else row.neutral += 1;
    } else {
      row.neutral += 1;
    }
  }

  return [...map.values()]
    .map(({ counts, ...row }) => ({
      ...row,
      outcomes: [...counts.entries()]
        .map(([outcome, count]) => ({ outcome, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total);
}
