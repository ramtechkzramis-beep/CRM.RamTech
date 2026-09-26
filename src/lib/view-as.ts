import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { getEmployeeById } from "@/lib/admin";

/** Cookie с id сотрудника, чей экран «Задачи» сейчас просматривается. */
export const VIEW_AS_COOKIE = "view_as_employee";

export async function getViewAsEmployeeId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VIEW_AS_COOKIE)?.value ?? null;
}

/**
 * Чей экран задач сейчас показываем: свой или сотрудника, за которого смотрим.
 *
 * «Смотреть как» — личное разрешение, а не роль: даже если кто-то подставит
 * cookie вручную, сотрудник подтянется, только если у его собственного
 * профиля стоит can_view_as.
 *
 * Одна функция на все экраны задач и на счётчики в шапке — иначе плитка
 * показывает число сотрудника, а список по клику открывает ваши задачи.
 */
export async function getTaskScreenTarget() {
  const profile = await requireProfile();
  const viewAsId = profile.can_view_as ? await getViewAsEmployeeId() : null;
  const employee = viewAsId ? await getEmployeeById(viewAsId) : null;

  return { profile, employee, targetId: employee?.id ?? profile.id };
}
