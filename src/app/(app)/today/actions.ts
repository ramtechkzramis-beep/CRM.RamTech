"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type TaskActionState = { error: string | null; ok?: boolean };

export async function createTask(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const profile = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "");

  if (!title) return { error: "Укажите, что нужно сделать" };
  if (!dueDate) return { error: "Укажите дату" };

  const clientId = String(formData.get("client_id") ?? "");
  const assigneeId = String(formData.get("assignee_id") ?? "") || profile.id;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    client_id: clientId || null,
    assignee_id: assigneeId,
    due_date: dueDate,
    due_time: String(formData.get("due_time") ?? "") || null,
    type: String(formData.get("type") ?? "call"),
    priority: String(formData.get("priority") ?? "normal"),
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
