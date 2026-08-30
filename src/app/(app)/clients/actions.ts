"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canManageStages, canManageUsers } from "@/lib/types";
import { todayISO } from "@/lib/dates";
import { buildPaymentPlan, calcTotals, clampDiscount, isPaymentScheme } from "@/lib/payments";
import { isArchiveReason } from "@/lib/client-types";
import { isPackage } from "@/lib/packages";
import { calcComboTotals, isPriceCity, isServiceCategory } from "@/lib/pricing";
import type { PriceCity, ServiceCategory } from "@/lib/pricing";
import type { ServicePackage } from "@/lib/packages";

export type ActionState = { error: string | null; ok?: boolean };

export async function createColdClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Укажите название компании" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name,
    city: String(formData.get("city") ?? "").trim() || null,
    contact_person: String(formData.get("contact_person") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    business_size: String(formData.get("business_size") ?? "") || null,
    source: String(formData.get("source") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "cold",
    owner_id: profile.id,
    department_id: profile.department_id,
    created_by: profile.id,
  });

  if (error) {
    return { error: `Не удалось добавить клиента: ${error.message}` };
  }

  revalidatePath("/clients/cold");
  return { error: null, ok: true };
}

export async function updateClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!clientId) return { error: "Клиент не указан" };
  if (!name) return { error: "Укажите название компании" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      city: String(formData.get("city") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      dgis_url: String(formData.get("dgis_url") ?? "").trim() || null,
      business_size: String(formData.get("business_size") ?? "") || null,
      source: String(formData.get("source") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", clientId);

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/cold");
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/**
 * Передача клиента другому сотруднику.
 * Только руководитель: перекидывать клиентов между менеджерами — решение
 * начальника, иначе сотрудники начнут перебрасывать неудобных друг другу.
 */
export async function reassignClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  // Проверяем здесь, а не только прячем кнопку: server action можно вызвать
  // в обход интерфейса.
  if (!canManageUsers(profile.role)) {
    return { error: "Передавать клиентов может только руководитель" };
  }

  const clientId = String(formData.get("client_id") ?? "");
  const ownerId = String(formData.get("owner_id") ?? "");

  if (!clientId) return { error: "Клиент не указан" };
  if (!ownerId) return { error: "Выберите сотрудника" };

  const supabase = await createClient();

  // Клиент переезжает в отдел нового ответственного — иначе он останется
  // виден прежнему отделу и пропадёт из нового.
  const { data: newOwner } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", ownerId)
    .maybeSingle();

  if (!newOwner) {
    return { error: "Сотрудник не найден" };
  }

  const { error } = await supabase
    .from("clients")
    .update({ owner_id: ownerId, department_id: newOwner.department_id })
    .eq("id", clientId);

  if (error) {
    return { error: `Не удалось передать: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/active");
  revalidatePath("/clients/cold");
  return { error: null, ok: true };
}

/** Массовое удаление — тоже проверяем роль в коде: RLS (clients_admin_delete) её продублирует. */
export async function bulkDeleteClients(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!canManageUsers(profile.role)) {
    return { error: "Удалять клиентов может только руководитель" };
  }

  const clientIds = formData.getAll("client_id").map(String).filter(Boolean);
  if (clientIds.length === 0) return { error: "Не выбрано ни одного клиента" };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().in("id", clientIds);

  if (error) return { error: `Не удалось удалить: ${error.message}` };

  revalidatePath("/clients/cold");
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/** Массовая передача клиентов другому сотруднику — та же логика, что и reassignClient. */
export async function bulkReassignClients(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!canManageUsers(profile.role)) {
    return { error: "Передавать клиентов может только руководитель" };
  }

  const clientIds = formData.getAll("client_id").map(String).filter(Boolean);
  const ownerId = String(formData.get("owner_id") ?? "");

  if (clientIds.length === 0) return { error: "Не выбрано ни одного клиента" };
  if (!ownerId) return { error: "Выберите сотрудника" };

  const supabase = await createClient();

  const { data: newOwner } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", ownerId)
    .maybeSingle();

  if (!newOwner) return { error: "Сотрудник не найден" };

  const { error } = await supabase
    .from("clients")
    .update({ owner_id: ownerId, department_id: newOwner.department_id })
    .in("id", clientIds);

  if (error) return { error: `Не удалось передать: ${error.message}` };

  revalidatePath("/clients/cold");
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/**
 * Этап работы над проектом: оформление → ТЗ → разработка → тест → одобрен.
 * Права проверяет функция в БД — она же не даст разработчику тронуть
 * остальные поля клиента.
 */
export async function updateStage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!canManageStages(profile.role)) {
    return { error: "Менять этап может только руководитель или разработчик" };
  }

  const clientId = String(formData.get("client_id") ?? "");
  const stage = String(formData.get("stage") ?? "");

  if (!clientId) return { error: "Клиент не указан" };

  const allowed = ["signing", "spec", "development", "testing", "approved"];
  if (!allowed.includes(stage)) {
    return { error: "Неизвестный этап" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_client_stage", {
    p_client_id: clientId,
    p_stage: stage,
  });

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/active");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

/** Оценка лояльности. Ставится вручную — это суждение менеджера о клиенте. */
export async function updateLoyalty(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const loyalty = String(formData.get("loyalty") ?? "");

  if (!clientId) return { error: "Клиент не указан" };
  if (!["green", "yellow", "red"].includes(loyalty)) {
    return { error: "Выберите цвет" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      loyalty,
      loyalty_note: String(formData.get("loyalty_note") ?? "").trim() || null,
    })
    .eq("id", clientId);

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

type ServiceInput = {
  city: PriceCity;
  category: ServiceCategory;
  package: ServicePackage;
  developmentPrice: number;
  subscriptionPrice: number;
};

/**
 * Разбирает JSON со списком выбранных услуг из скрытого поля формы.
 * Не доверяем клиенту: каждое поле проверяем отдельно, а не полагаемся
 * на форму — экшен можно вызвать в обход интерфейса.
 */
function parseServices(raw: FormDataEntryValue | null): ServiceInput[] | null {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 3) return null;

  const result: ServiceInput[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return null;
    const row = item as Record<string, unknown>;

    const city = String(row.city ?? "");
    if (!isPriceCity(city)) return null;

    const category = String(row.category ?? "");
    if (!isServiceCategory(category)) return null;

    const pkg = String(row.package ?? "");
    if (!isPackage(pkg)) return null;

    const developmentPrice = Number(row.developmentPrice);
    const subscriptionPrice = Number(row.subscriptionPrice);
    if (!Number.isFinite(developmentPrice) || developmentPrice < 0) return null;
    if (!Number.isFinite(subscriptionPrice) || subscriptionPrice < 0) return null;

    result.push({ city, category, package: pkg, developmentPrice, subscriptionPrice });
  }

  const categories = new Set(result.map((s) => s.category));
  if (categories.size !== result.length) return null;

  return result;
}

/**
 * Состав услуг клиента (бот/CRM/сайт), срок договора, суммы, скидка и схема
 * оплаты. Суммы разработки и абонемента считаются от выбранных услуг через
 * calcComboTotals — при нескольких услугах разом действует скидка за
 * комбинацию. Заодно перестраивает график платежей: суммы траншей считаются
 * от итога, и при смене цены или скидки старый график врал бы.
 */
export async function updateClientPackage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Клиент не указан" };

  const months = Number(formData.get("contract_months") ?? 6);
  if (![3, 6, 12].includes(months)) {
    return { error: "Срок договора может быть 3, 6 или 12 месяцев" };
  }

  const services = parseServices(formData.get("services"));
  if (services === null) {
    return { error: "Не удалось разобрать выбранные услуги" };
  }

  const totals = calcComboTotals(
    services.map((s) => ({
      packagePrice: s.developmentPrice + s.subscriptionPrice,
      developmentPrice: s.developmentPrice,
    })),
  );

  const development = services.length > 0 ? totals.developmentPrice : null;
  const subscription = services.length > 0 ? totals.subscriptionPrice : null;
  const discount = clampDiscount(Number(formData.get("discount_percent") ?? 0));
  const schemeRaw = String(formData.get("payment_scheme") ?? "");
  const scheme = isPaymentScheme(schemeRaw) ? schemeRaw : null;

  // Один пакет на бейджах карточки и в старых потребителях (таблица клиентов,
  // КП) есть смысл показывать только когда услуга ровно одна — при комбо
  // это был бы обман, там уже нет одного «пакета».
  const singlePackage = services.length === 1 ? services[0].package : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      package: singlePackage,
      contract_months: months,
      development_price: development,
      subscription_price: subscription,
      discount_percent: discount,
      payment_scheme: scheme,
    })
    .eq("id", clientId);

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  // Проще пересобрать состав целиком, чем сверять построчные различия —
  // строк всего до трёх (бот/CRM/сайт).
  await supabase.from("client_services").delete().eq("client_id", clientId);

  if (services.length > 0) {
    const { error: servicesError } = await supabase.from("client_services").insert(
      services.map((s) => ({
        client_id: clientId,
        city: s.city,
        category: s.category,
        package: s.package,
        development_price: s.developmentPrice,
        subscription_price: s.subscriptionPrice,
      })),
    );

    if (servicesError) {
      return { error: `Не удалось сохранить состав услуг: ${servicesError.message}` };
    }
  }

  if (scheme) {
    const { total } = calcTotals(development, subscription, discount);
    const plan = buildPaymentPlan(total, scheme);

    // Даты платежей приходят из формы: seq → дата.
    const dates = plan.map((item) => {
      const value = String(formData.get(`due_date_${item.seq}`) ?? "");
      return value || null;
    });

    // Отметки «оплачено» сохраняем: пересборка графика не должна их сбрасывать,
    // иначе после правки цены все поступления обнулятся.
    const { data: existing } = await supabase
      .from("client_payments")
      .select("seq, is_paid")
      .eq("client_id", clientId);

    const paidBySeq = new Map(
      (existing ?? []).map((row) => [row.seq as number, row.is_paid as boolean]),
    );

    await supabase.from("client_payments").delete().eq("client_id", clientId);

    const { error: planError } = await supabase.from("client_payments").insert(
      plan.map((item, index) => ({
        client_id: clientId,
        seq: item.seq,
        percent: item.percent,
        amount: item.amount,
        due_date: dates[index],
        is_paid: paidBySeq.get(item.seq) ?? false,
      })),
    );

    if (planError) {
      return { error: `Не удалось сохранить график: ${planError.message}` };
    }
  } else {
    await supabase.from("client_payments").delete().eq("client_id", clientId);
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/** Отметка о поступлении платежа. Дату проставит триггер в БД. */
export async function togglePayment(formData: FormData) {
  await requireProfile();

  const paymentId = String(formData.get("payment_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const paid = String(formData.get("paid") ?? "") === "true";

  if (!paymentId) return;

  const supabase = await createClient();
  await supabase
    .from("client_payments")
    .update({ is_paid: paid })
    .eq("id", paymentId);

  revalidatePath(`/clients/${clientId}`);
}

export async function saveContact(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!clientId) return { error: "Клиент не указан" };
  if (!fullName) return { error: "Укажите имя" };

  const values = {
    full_name: fullName,
    role: String(formData.get("role") ?? "") || null,
    position: String(formData.get("position") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
  };

  const supabase = await createClient();

  // Один и тот же экран заводит нового человека и правит существующего —
  // разница только в наличии contact_id.
  const { error } = contactId
    ? await supabase.from("client_contacts").update(values).eq("id", contactId)
    : await supabase
        .from("client_contacts")
        .insert({ ...values, client_id: clientId });

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

export async function deleteContact(formData: FormData) {
  await requireProfile();

  const contactId = String(formData.get("contact_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!contactId) return;

  const supabase = await createClient();
  await supabase.from("client_contacts").delete().eq("id", contactId);

  revalidatePath(`/clients/${clientId}`);
}

/**
 * В наработки — после встречи с менеджером, компания готова работать
 * с нами на 70-80%. Обычный update, а не RPC: проверять тут нечего,
 * кроме того, что клиент правда ещё в холодной базе.
 */
export async function moveToWarm(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!clientId) return { error: "Клиент не указан" };
  if (!reason) return { error: "Укажите, почему это наработка" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      status: "warm",
      warm_reason: reason,
      warm_at: new Date().toISOString(),
      warm_by: profile.id,
    })
    .eq("id", clientId)
    .eq("status", "cold")
    .select("id");

  if (error) return { error: `Не удалось перевести: ${error.message}` };
  if (!data || data.length === 0) {
    return { error: "Клиент не найден или уже не в холодной базе" };
  }

  revalidatePath("/clients/cold");
  revalidatePath("/clients/warm");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/** Наработка не сложилась — возвращаем в холодную базу, пока не появится новый повод. */
export async function revertToCold(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Клиент не указан" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      status: "cold",
      warm_reason: null,
      warm_at: null,
      warm_by: null,
    })
    .eq("id", clientId)
    .eq("status", "warm")
    .select("id");

  if (error) return { error: `Не удалось вернуть: ${error.message}` };
  if (!data || data.length === 0) {
    return { error: "Клиент не найден или уже не в наработках" };
  }

  revalidatePath("/clients/cold");
  revalidatePath("/clients/warm");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/**
 * Переводит клиента из холодной базы в работу — он попадает в воронку.
 * ППС здесь не начинается: он стартует, когда проект дойдёт до «Одобрен».
 */
export async function activateClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const signedDate = String(formData.get("signed_date") ?? "");

  if (!clientId || !signedDate) {
    return { error: "Укажите дату подписания договора" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_client", {
    p_client_id: clientId,
    p_signed_date: signedDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients/cold");
  revalidatePath("/clients/active");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/**
 * Правка даты старта ППС. Обычно её ставит система при одобрении проекта,
 * но одобрить могли задним числом — тогда дату нужно поправить руками,
 * иначе поедет и сегмент, и дата продления.
 */
export async function updateCycleStart(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  const startDate = String(formData.get("cycle_start_date") ?? "");

  if (!clientId) return { error: "Клиент не указан" };
  if (!startDate) return { error: "Укажите дату" };

  if (startDate > todayISO()) {
    return { error: "Дата не может быть в будущем" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ cycle_start_date: startDate })
    .eq("id", clientId);

  if (error) {
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients/active");
  return { error: null, ok: true };
}

/** Продление: база закроет текущий цикл и откроет следующий. */
export async function renewClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) {
    return { error: "Клиент не указан" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("renew_client", {
    p_client_id: clientId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients/active");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/**
 * Убрать клиента из текущих (в архив). Право проверяем и здесь, а не только
 * прячем кнопку: server action можно вызвать в обход интерфейса. Функция
 * в БД проверяет то же самое ещё раз, на случай прямого вызова RPC.
 */
export async function archiveClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!canManageUsers(profile.role)) {
    return { error: "Убрать клиента из текущих может только руководитель" };
  }

  const clientId = String(formData.get("client_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!clientId) return { error: "Клиент не указан" };
  if (!isArchiveReason(reason)) return { error: "Выберите причину" };

  const supabase = await createClient();
  const { error: archiveError } = await supabase.rpc("archive_client", {
    p_client_id: clientId,
    p_reason: reason,
    p_comment: comment || null,
  });

  if (archiveError) return { error: archiveError.message };

  revalidatePath("/clients/active");
  revalidatePath("/clients/archived");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}

/** Возврат из архива в текущие клиенты — на случай ошибки. */
export async function restoreClient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  if (!canManageUsers(profile.role)) {
    return { error: "Восстановить клиента может только руководитель" };
  }

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Клиент не указан" };

  const supabase = await createClient();
  const { error: restoreError } = await supabase.rpc("restore_client", {
    p_client_id: clientId,
  });

  if (restoreError) return { error: restoreError.message };

  revalidatePath("/clients/active");
  revalidatePath("/clients/archived");
  revalidatePath(`/clients/${clientId}`);
  return { error: null, ok: true };
}
