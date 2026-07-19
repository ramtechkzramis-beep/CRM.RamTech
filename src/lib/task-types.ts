/**
 * Типы и подписи задач — без обращений к базе.
 * Отдельно от tasks.ts специально: tasks.ts тянет Supabase и next/headers,
 * а эти константы нужны и браузерным компонентам (формам).
 */

export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "normal" | "high";
export type TaskType = "call" | "meeting" | "payment" | "service";

export const TASK_TYPES: TaskType[] = ["call", "meeting", "payment", "service"];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Прозвон",
  meeting: "Встреча",
  payment: "Оплата",
  service: "Сервис",
};

export const TASK_TYPE_STYLES: Record<TaskType, string> = {
  call: "bg-sky-100 text-sky-800",
  meeting: "bg-violet-100 text-violet-800",
  payment: "bg-emerald-100 text-emerald-800",
  service: "bg-amber-100 text-amber-800",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-800",
  high: "bg-red-100 text-red-800",
};

export type TaskOutcome =
  | "call_reached"
  | "call_no_answer"
  | "call_callback"
  | "call_refused"
  | "meeting_held"
  | "meeting_cancelled"
  | "meeting_rescheduled"
  | "meeting_no_show"
  | "payment_paid"
  | "payment_partial"
  | "payment_deferred"
  | "payment_refused"
  | "service_done"
  | "service_rework"
  | "service_postponed";

/** Какие результаты доступны для каждого типа задачи. */
export const OUTCOMES_BY_TYPE: Record<TaskType, TaskOutcome[]> = {
  call: ["call_reached", "call_no_answer", "call_callback", "call_refused"],
  meeting: [
    "meeting_held",
    "meeting_cancelled",
    "meeting_rescheduled",
    "meeting_no_show",
  ],
  payment: [
    "payment_paid",
    "payment_partial",
    "payment_deferred",
    "payment_refused",
  ],
  service: ["service_done", "service_rework", "service_postponed"],
};

export const OUTCOME_LABELS: Record<TaskOutcome, string> = {
  call_reached: "Дозвонился",
  call_no_answer: "Не дозвонился",
  call_callback: "Перезвонить",
  call_refused: "Отказ",
  meeting_held: "Проведена",
  meeting_cancelled: "Отменена",
  meeting_rescheduled: "Перенесена",
  meeting_no_show: "Не пришли",
  payment_paid: "Оплачено",
  payment_partial: "Частично",
  payment_deferred: "Отсрочка",
  payment_refused: "Отказ",
  service_done: "Выполнено",
  service_rework: "Требует доработки",
  service_postponed: "Отложено",
};

/**
 * Тон результата: успех, неудача или промежуточный исход.
 * Нужен, чтобы в списке было видно, где всё хорошо, а где клиент отваливается.
 */
export const OUTCOME_TONE: Record<TaskOutcome, "good" | "bad" | "neutral"> = {
  call_reached: "good",
  call_no_answer: "neutral",
  call_callback: "neutral",
  call_refused: "bad",
  meeting_held: "good",
  meeting_cancelled: "bad",
  meeting_rescheduled: "neutral",
  meeting_no_show: "bad",
  payment_paid: "good",
  payment_partial: "neutral",
  payment_deferred: "neutral",
  payment_refused: "bad",
  service_done: "good",
  service_rework: "neutral",
  service_postponed: "neutral",
};

export const OUTCOME_STYLES: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-emerald-100 text-emerald-800",
  bad: "bg-red-100 text-red-800",
  neutral: "bg-slate-100 text-slate-600",
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assignee_id: string;
  due_date: string;
  /** Время в формате HH:MM:SS или null — задача на день без конкретного часа. */
  due_time: string | null;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  outcome: TaskOutcome | null;
  outcome_note: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TaskWithRelations = Task & {
  // Данные клиента тянем сырыми (дата старта и срок), а сегмент ППС считаем
  // на месте: view с сегментом через связь PostgREST не подтянуть.
  client: {
    id: string;
    name: string;
    status: string;
    cycle_start_date: string | null;
    contract_months: number;
    loyalty: string | null;
  } | null;
  assignee: { full_name: string } | null;
};

export type DayTasks = {
  overdue: TaskWithRelations[];
  today: TaskWithRelations[];
  tomorrow: TaskWithRelations[];
};
