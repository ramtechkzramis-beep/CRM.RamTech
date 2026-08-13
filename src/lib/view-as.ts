import { cookies } from "next/headers";

/** Cookie с id сотрудника, чей экран «Задачи» сейчас просматривается. */
export const VIEW_AS_COOKIE = "view_as_employee";

export async function getViewAsEmployeeId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VIEW_AS_COOKIE)?.value ?? null;
}
