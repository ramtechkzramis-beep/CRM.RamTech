"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { VIEW_AS_COOKIE } from "@/lib/view-as";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/task-types";

export type TaskActionState = { error: string | null; ok?: boolean };

export async function createTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const profile = await requireProfile();

  const dueDate = String(formData.get("due_date") ?? "");
  if (!dueDate) return { error: "Укажите дату" };

  // Отдельного поля «Что нужно сделать» больше нет — заголовок задачи
  // это название её типа, а подробности живут в description.
  const type = String(formData.get("type") ?? "call") as TaskType;
  const title = TASK_TYPE_LABELS[type] ?? "Задача";

  const clientId = String(formData.get("client_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "") || profile.id;

  const supabase = await createClient();

  // Контакт — либо выбранный существующий, либо только что заведённый
  // прямо из формы задачи (новое контактное лицо клиента).
  const rawContactId = String(formData.get("contact_id") ?? "");
  const newContactName = String(formData.get("new_contact_name") ?? "").trim();
  let contactId: string | null = null;

  if (rawContactId === "__new__" && newContactName && clientId) {
    const { data: newContact, error: contactError } = await supabase
      .from("client_contacts")
      .insert({
        client_id: clientId,
        full_name: newContactName,
        phone: String(formData.get("new_contact_phone") ?? "").trim() || null,
      })
      .select("id")
      .single();

    if (contactError) {
      return { error: `Не удалось добавить контакт: ${contactError.message}` };
    }
    contactId = newContact.id;
  } else if (rawContactId && rawContactId !== "__new__") {
    contactId = rawContactId;
  }

  // «Завершить» прямо при создании — для задач, которые уже случились
  // (например, звонок был вчера, и его просто нужно зафиксировать).
  // Незакрытой done-задачи не бывает: constraint done_task_needs_outcome
  // в базе того же требует.
  const isCompleting = String(formData.get("action") ?? "save") === "complete";
  const outcome = String(formData.get("outcome") ?? "");

  if (isCompleting && !outcome) {
    return { error: "Выберите, чем закончилось" };
  }

  const { error } = await supabase.from("tasks").insert({
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    client_id: clientId || null,
    assignee_id: assigneeId,
    due_date: dueDate,
    due_time: String(formData.get("due_time") ?? "") || null,
    type,
    priority: String(formData.get("priority") ?? "normal"),
    contact_id: contactId,
    location: String(formData.get("location") ?? "").trim() || null,
    status: isCompleting ? "done" : "open",
    outcome: isCompleting ? outcome : null,
    outcome_note: isCompleting
      ? String(formData.get("outcome_note") ?? "").trim() || null
      : null,
    created_by: profile.id,
  });

  if (error) {
    return { error: `Не удалось создать задачу: ${error.message}` };
  }

  revalidatePath("/today");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/**
 * Закрытие задачи с результатом. Без результата закрыть нельзя —
 * иначе непонятно, чем всё кончилось, ради чего это и затевалось.
 * completed_at проставит триггер в БД.
 */
export async function closeTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  await requireProfile();

  const taskId = String(formData.get("task_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const clientId = String(formData.get("client_id") ?? "");

  if (!taskId) return { error: "Задача не указана" };
  if (!outcome) return { error: "Выберите, чем закончилось" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      outcome,
      outcome_note: String(formData.get("outcome_note") ?? "").trim() || null,
    })
    .eq("id", taskId);

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath("/today");
  revalidatePath("/summary");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/** Возврат задачи в работу — результат при этом стирает триггер в БД. */
export async function reopenTask(formData: FormData) {
  await requireProfile();

  const taskId = String(formData.get("task_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!taskId) return;

  const supabase = await createClient();
  await supabase.from("tasks").update({ status: "open" }).eq("id", taskId);

  revalidatePath("/today");
  revalidatePath("/summary");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

/**
 * «Смотреть как сотрудник» — включить или выключить просмотр.
 * Личное разрешение (can_view_as), а не роль: даже другой admin
 * этой кнопки в интерфейсе не увидит и, если вызовет экшен напрямую,
 * получит отказ здесь же.
 */
export async function setViewAsEmployee(formData: FormData) {
  const profile = await requireProfile();
  if (!profile.can_view_as) return;

  const employeeId = String(formData.get("employee_id") ?? "");
  const cookieStore = await cookies();

  if (!employeeId) {
    cookieStore.delete(VIEW_AS_COOKIE);
  } else {
    cookieStore.set(VIEW_AS_COOKIE, employeeId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  revalidatePath("/today");
}

export async function clearViewAsEmployee() {
  const profile = await requireProfile();
  if (!profile.can_view_as) return;

  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
  revalidatePath("/today");
}

/**
 * Автосохранение личного черновика. Без revalidatePath — это бы дёргало
 * серверный рендер всей страницы при каждой паузе в наборе текста.
 */
export async function saveMyNotes(formData: FormData) {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "");

  const supabase = await createClient();
  await supabase
    .from("personal_notes")
    .upsert({ user_id: profile.id, content, updated_at: new Date().toISOString() });
}
