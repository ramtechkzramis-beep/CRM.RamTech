"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { canManageUsers, type AppRole } from "@/lib/types";

export type ActionState = { error: string | null; ok?: boolean };
export type CreateEmployeeState = ActionState & { tempPassword?: string };

const ALLOWED_ROLES: AppRole[] = ["admin", "head", "manager", "developer"];

// Без 0/O/1/l/I — сотрудник будет диктовать пароль по телефону или в чат,
// а эти символы визуально путаются.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join("");
}

async function assertAdmin() {
  const profile = await requireProfile();
  if (!canManageUsers(profile.role)) {
    throw new Error("Доступно только руководителю");
  }
  return profile;
}

// --- Отделы -----------------------------------------------------------

export async function createDepartment(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Укажите название отдела" };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({ name });

  if (error) {
    return {
      error: error.code === "23505" ? "Такой отдел уже есть" : error.message,
    };
  }

  revalidatePath("/admin");
  return { error: null, ok: true };
}

export async function renameDepartment(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const id = String(formData.get("department_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Отдел не указан" };
  if (!name) return { error: "Укажите название отдела" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null, ok: true };
}

/**
 * Удаление отдела не трогает сотрудников и клиентов — внешний ключ переводит
 * их department_id в null (см. миграцию 0001/0002). Предупреждение об этом
 * показывается в интерфейсе перед подтверждением.
 */
export async function deleteDepartment(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("department_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("departments").delete().eq("id", id);

  revalidatePath("/admin");
}

// --- Сотрудники ---------------------------------------------------------

/**
 * Заводит сотрудника через Auth Admin API и возвращает временный пароль —
 * его нужно один раз показать руководителю и передать сотруднику вручную
 * (по телефону, в мессенджере). Повторно узнать его будет нельзя.
 */
export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  await assertAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const departmentId = String(formData.get("department_id") ?? "") || null;

  if (!fullName) return { error: "Укажите имя" };
  if (!email) return { error: "Укажите почту" };
  if (!ALLOWED_ROLES.includes(role as AppRole)) {
    return { error: "Выберите роль" };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    return {
      error:
        error.code === "email_exists"
          ? "Сотрудник с такой почтой уже есть"
          : `Не удалось создать: ${error.message}`,
    };
  }

  // Триггер handle_new_user() уже создал профиль с именем и ролью —
  // отдел он не знает, дописываем отдельным шагом.
  if (departmentId && data.user) {
    await admin
      .from("profiles")
      .update({ department_id: departmentId })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin");
  return { error: null, ok: true, tempPassword };
}

export async function updateEmployeeRole(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("employee_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !ALLOWED_ROLES.includes(role as AppRole)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);

  revalidatePath("/admin");
}

export async function updateEmployeeDepartment(formData: FormData) {
  await assertAdmin();

  const id = String(formData.get("employee_id") ?? "");
  const departmentId = String(formData.get("department_id") ?? "") || null;
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ department_id: departmentId })
    .eq("id", id);

  revalidatePath("/admin");
}

/**
 * Деактивация вместо удаления: у сотрудника остаются клиенты, задачи
 * и история — просто больше не может войти (requireProfile проверяет
 * is_active). Удалять человека из базы вместе с этой историей нельзя.
 */
export async function toggleEmployeeActive(formData: FormData) {
  const profile = await assertAdmin();

  const id = String(formData.get("employee_id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  if (id === profile.id && !active) {
    // Иначе руководитель может выключить сам себя и потерять доступ.
    return;
  }

  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: active }).eq("id", id);

  revalidatePath("/admin");
}

export async function resetEmployeePassword(
  _prevState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  await assertAdmin();

  const id = String(formData.get("employee_id") ?? "");
  if (!id) return { error: "Сотрудник не указан" };

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { error } = await admin.auth.admin.updateUserById(id, {
    password: tempPassword,
  });

  if (error) return { error: `Не удалось сбросить пароль: ${error.message}` };

  return { error: null, ok: true, tempPassword };
}
