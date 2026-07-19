export type AppRole = "admin" | "head" | "manager" | "developer";

export type Department = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Руководитель",
  head: "Руководитель отдела",
  manager: "Менеджер",
  developer: "Разработчик",
};

export function canSeeDashboard(role: AppRole) {
  return role === "admin" || role === "head";
}

export function canManageUsers(role: AppRole) {
  return role === "admin";
}

/** База знаний открыта на чтение всем, но пишут только руководство. */
export function canManageKnowledge(role: AppRole) {
  return role === "admin" || role === "head";
}

/**
 * Двигать проект по воронке могут только руководитель и разработчик.
 * Остальные видят этапы, но не переключают: случайный клик по воронке
 * запускал бы ППС или откатывал проект назад.
 * Дублируется в set_client_stage() в БД — интерфейс лишь прячет кнопки.
 */
export function canManageStages(role: AppRole) {
  return role === "admin" || role === "developer";
}
