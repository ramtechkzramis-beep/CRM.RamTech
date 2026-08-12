"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Package, Check, Wallet, FileDown, Eye, EyeOff } from "lucide-react";
import { updateClientPackage, togglePayment } from "@/app/(app)/clients/actions";
import type { ClientPayment, ClientService, ClientWithSegment } from "@/lib/client-types";
import {
  CONTRACT_MONTHS,
  PACKAGES,
  PACKAGE_LABELS,
  PACKAGE_STYLES,
  formatTenge,
  isPackage,
  type ContractMonths,
  type ServicePackage,
} from "@/lib/packages";
import {
  CITY_LABELS,
  PRICE_CITIES,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  calcComboTotals,
  type PriceCity,
  type PricePosition,
  type ServiceCategory,
} from "@/lib/pricing";
import {
  MAX_DISCOUNT,
  PAYMENT_SCHEMES,
  SCHEME_HINTS,
  SCHEME_LABELS,
  buildPaymentPlan,
  calcTotals,
  clampDiscount,
  isPaymentScheme,
  monthlyLoad,
  type PaymentScheme,
} from "@/lib/payments";
import { formatDateRu, todayISO } from "@/lib/dates";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

type ServiceRow = {
  category: ServiceCategory;
  selected: boolean;
  package: ServicePackage | "";
  development: string;
  subscription: string;
};

function emptyRow(category: ServiceCategory): ServiceRow {
  return { category, selected: false, package: "", development: "", subscription: "" };
}

/** Город по умолчанию: пробуем узнать по текстовому полю «Город» у клиента. */
function guessCity(clientCity: string | null): PriceCity {
  const normalized = (clientCity ?? "").trim().toLowerCase();
  if (normalized.includes("алмат")) return "almaty";
  if (normalized.includes("шымкент") || normalized.includes("чимкент")) return "shymkent";
  return "shymkent";
}

function initialRows(client: ClientWithSegment, services: ClientService[]): ServiceRow[] {
  const rows = SERVICE_CATEGORIES.map(emptyRow);

  if (services.length > 0) {
    for (const service of services) {
      const row = rows.find((r) => r.category === service.category);
      if (!row) continue;
      row.selected = true;
      row.package = service.package;
      row.development = String(service.development_price);
      row.subscription = String(service.subscription_price);
    }
    return rows;
  }

  // Старые клиенты без строк в client_services: единственная услуга — бот,
  // единственная категория, которая существовала до расширения на CRM/сайты.
  if (client.package) {
    const row = rows.find((r) => r.category === "bot")!;
    row.selected = true;
    row.package = client.package;
    row.development = client.development_price != null ? String(client.development_price) : "";
    row.subscription = client.subscription_price != null ? String(client.subscription_price) : "";
  }

  return rows;
}

function findPosition(
  positions: PricePosition[],
  city: PriceCity,
  category: ServiceCategory,
  pkg: string,
  months: ContractMonths,
): PricePosition | undefined {
  return positions.find(
    (p) =>
      p.city === city && p.category === category && p.package === pkg && p.contractMonths === months,
  );
}

function PackageForm({
  client,
  payments,
  services,
  positions,
  onClose,
}: {
  client: ClientWithSegment;
  payments: ClientPayment[];
  services: ClientService[];
  positions: PricePosition[];
  onClose: () => void;
}) {
  const [city, setCity] = useState<PriceCity>(() =>
    services[0]?.city ?? guessCity(client.city),
  );
  const [months, setMonths] = useState<ContractMonths>(client.contract_months);
  const [rows, setRows] = useState<ServiceRow[]>(() => initialRows(client, services));
  const [discount, setDiscount] = useState(client.discount_percent ?? 0);
  const [scheme, setScheme] = useState<PaymentScheme | "">(
    client.payment_scheme ?? "",
  );
  const [dates, setDates] = useState<Record<number, string>>(() =>
    Object.fromEntries(payments.map((p) => [p.seq, p.due_date ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateRow(category: ServiceCategory, patch: Partial<ServiceRow>) {
    setRows((prev) =>
      prev.map((row) => (row.category === category ? { ...row, ...patch } : row)),
    );
  }

  function toggleRow(category: ServiceCategory) {
    setRows((prev) =>
      prev.map((row) => (row.category === category ? { ...row, selected: !row.selected } : row)),
    );
  }

  // Цены подставляем из прайса, но не запираем: скидки и правки руками —
  // обычное дело, особенно в Enterprise, где фиксированной цены нет вовсе.
  function applyPrice(category: ServiceCategory, pkg: ServicePackage | "", nextCity: PriceCity, nextMonths: ContractMonths) {
    if (!pkg || pkg === "enterprise") return;
    const position = findPosition(positions, nextCity, category, pkg, nextMonths);
    if (!position) return;
    updateRow(category, {
      development: String(position.developmentPrice),
      subscription: String(position.packagePrice - position.developmentPrice),
    });
  }

  function handleCityChange(next: PriceCity) {
    setCity(next);
    setRows((prev) =>
      prev.map((row) => {
        if (!row.selected || !row.package || row.package === "enterprise") return row;
        const position = findPosition(positions, next, row.category, row.package, months);
        if (!position) return row;
        return {
          ...row,
          development: String(position.developmentPrice),
          subscription: String(position.packagePrice - position.developmentPrice),
        };
      }),
    );
  }

  function handleMonthsChange(next: ContractMonths) {
    setMonths(next);
    setRows((prev) =>
      prev.map((row) => {
        if (!row.selected || !row.package || row.package === "enterprise") return row;
        const position = findPosition(positions, city, row.category, row.package, next);
        if (!position) return row;
        return {
          ...row,
          development: String(position.developmentPrice),
          subscription: String(position.packagePrice - position.developmentPrice),
        };
      }),
    );
  }

  const selectedRows = rows.filter((row) => row.selected && row.package);

  const combo = useMemo(
    () =>
      calcComboTotals(
        selectedRows.map((row) => ({
          packagePrice: (Number(row.development) || 0) + (Number(row.subscription) || 0),
          developmentPrice: Number(row.development) || 0,
        })),
      ),
    [selectedRows],
  );

  const totals = calcTotals(combo.developmentPrice, combo.subscriptionPrice, discount);
  const plan = scheme ? buildPaymentPlan(totals.total, scheme) : [];
  const load = monthlyLoad(totals.subscriptionAfterDiscount, months);

  const servicesPayload = JSON.stringify(
    selectedRows.map((row) => ({
      city,
      category: row.category,
      package: row.package,
      developmentPrice: Number(row.development) || 0,
      subscriptionPrice: Number(row.subscription) || 0,
    })),
  );

  function handleAction(formData: FormData) {
    // Проверяем на клиенте до отправки: пакет без цифр — почти всегда
    // забытый выбор пакета, а не намеренный ноль.
    for (const row of selectedRows) {
      if (!row.development && !row.subscription) {
        setError(`Укажите цену для услуги «${SERVICE_CATEGORY_LABELS[row.category]}»`);
        return;
      }
    }

    startTransition(async () => {
      const result = await updateClientPackage({ error: null }, formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Пакет и договор</h3>

        <form action={handleAction} className="space-y-4">
          <input type="hidden" name="client_id" value={client.id} />
          <input type="hidden" name="services" value={servicesPayload} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Город</label>
              <div className="flex gap-2">
                {PRICE_CITIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleCityChange(value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                      city === value
                        ? "border-brand bg-gradient-to-r from-brand to-brand-dark font-medium text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {CITY_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Срок договора</label>
              <div className="flex gap-2">
                {CONTRACT_MONTHS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleMonthsChange(value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                      months === value
                        ? "border-brand bg-gradient-to-r from-brand to-brand-dark font-medium text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {value} мес.
                  </button>
                ))}
              </div>
              <input type="hidden" name="contract_months" value={months} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Один срок и один город — на все услуги клиента сразу.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Услуги</label>
            {rows.map((row) => {
              const position =
                row.package && row.package !== "enterprise"
                  ? findPosition(positions, city, row.category, row.package, months)
                  : undefined;

              return (
                <div
                  key={row.category}
                  className={`rounded-lg border p-3 transition ${
                    row.selected ? "border-brand/40 bg-brand-soft/40" : "border-slate-200"
                  }`}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRow(row.category)}
                      className="size-4 rounded accent-[#7c3aed]"
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {SERVICE_CATEGORY_LABELS[row.category]}
                    </span>
                  </label>

                  {row.selected && (
                    <div className="mt-3 space-y-3 pl-6">
                      <select
                        value={row.package}
                        onChange={(e) => {
                          const next = isPackage(e.target.value) ? e.target.value : "";
                          updateRow(row.category, { package: next });
                          applyPrice(row.category, next, city, months);
                        }}
                        className={FIELD_CLASS}
                      >
                        <option value="">Выберите пакет</option>
                        {PACKAGES.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {PACKAGE_LABELS[pkg]}
                          </option>
                        ))}
                      </select>

                      {position && (
                        <p className="text-xs text-slate-500">
                          {position.composition}
                          {position.dialogLimit && ` · ${position.dialogLimit}`}
                        </p>
                      )}
                      {row.package === "enterprise" && (
                        <p className="text-xs text-slate-500">
                          Индивидуальная цена — укажите разработку и абонемент вручную.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Разработка, ₸</label>
                          <input
                            inputMode="numeric"
                            value={row.development}
                            onChange={(e) =>
                              updateRow(row.category, { development: e.target.value })
                            }
                            className={FIELD_CLASS}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">
                            Абонемент за {months} мес., ₸
                          </label>
                          <input
                            inputMode="numeric"
                            value={row.subscription}
                            onChange={(e) =>
                              updateRow(row.category, { subscription: e.target.value })
                            }
                            className={FIELD_CLASS}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="discount_percent"
              className="text-sm font-medium text-slate-700"
            >
              Скидка: {discount}%
            </label>
            {/* Ползунок, а не поле: скидка ограничена 20%, и мимо диапазона
                промахнуться нельзя. */}
            <input
              id="discount_percent"
              name="discount_percent"
              type="range"
              min={0}
              max={MAX_DISCOUNT}
              step={1}
              value={discount}
              onChange={(e) => setDiscount(clampDiscount(Number(e.target.value)))}
              className="w-full accent-[#7c3aed]"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0%</span>
              <span>{MAX_DISCOUNT}%</span>
            </div>
          </div>

          {/* Итоги считаем на лету: менеджер видит, что обещает клиенту,
              ещё до сохранения. */}
          <dl className="space-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
            {selectedRows.length > 1 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {selectedRows.length} услуги · скидка за комбинацию{" "}
                  {Math.round((1 - combo.coefficient) * 100)}%
                </dt>
                <dd className="text-slate-700">
                  {formatTenge(combo.baseTotal)} → {formatTenge(combo.comboTotal)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Сумма по прайсу</dt>
              <dd className="text-slate-700">{formatTenge(totals.base)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-emerald-700">Скидка {discount}%</dt>
                <dd className="font-medium text-emerald-700">
                  −{formatTenge(totals.discountAmount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <dt className="font-medium text-slate-900">К оплате</dt>
              <dd className="font-semibold text-slate-900">
                {formatTenge(totals.total)}
              </dd>
            </div>
            {discount > 0 && (
              <p className="pt-1 text-xs text-slate-500">
                Разработка {formatTenge(totals.developmentAfterDiscount)} + абонемент{" "}
                {formatTenge(totals.subscriptionAfterDiscount)}
              </p>
            )}
            {/* Груз считается сразу же при вводе цифр — не нужно сохранять,
                чтобы увидеть месячную стоимость абонемента. */}
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <dt className="text-slate-500">
                Груз в месяц
                <span className="ml-1 text-xs text-slate-400">
                  (абонемент за {months} мес. ÷ {months})
                </span>
              </dt>
              <dd className="font-medium text-brand-dark">{formatTenge(load)}/мес</dd>
            </div>
          </dl>

          <div className="space-y-1.5">
            <label
              htmlFor="payment_scheme"
              className="text-sm font-medium text-slate-700"
            >
              Схема оплаты
            </label>
            <select
              id="payment_scheme"
              name="payment_scheme"
              value={scheme}
              onChange={(e) =>
                setScheme(isPaymentScheme(e.target.value) ? e.target.value : "")
              }
              className={FIELD_CLASS}
            >
              <option value="">Не выбрана</option>
              {PAYMENT_SCHEMES.map((item) => (
                <option key={item} value={item}>
                  {SCHEME_LABELS[item]}
                </option>
              ))}
            </select>
            {scheme && <p className="text-xs text-slate-500">{SCHEME_HINTS[scheme]}</p>}
          </div>

          {plan.length > 0 && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">
                {scheme === "kaspi" ? "Поступление" : "График платежей"}
              </p>

              {plan.map((item) => (
                <div key={item.seq} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-xs text-slate-500">
                    {item.percent}%
                  </span>
                  <span className="w-32 shrink-0 text-sm font-medium text-slate-900">
                    {formatTenge(item.amount)}
                  </span>
                  <input
                    name={`due_date_${item.seq}`}
                    type="date"
                    value={dates[item.seq] ?? ""}
                    onChange={(e) =>
                      setDates((prev) => ({ ...prev, [item.seq]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </div>
              ))}

              <p className="text-xs text-slate-500">
                {scheme === "kaspi"
                  ? "Дата поступления от банка."
                  : "Даты платежей по договору."}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark disabled:opacity-60"
            >
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: ClientPayment }) {
  const overdue =
    !payment.is_paid && !!payment.due_date && payment.due_date < todayISO();

  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <form action={togglePayment}>
        <input type="hidden" name="payment_id" value={payment.id} />
        <input type="hidden" name="client_id" value={payment.client_id} />
        <input type="hidden" name="paid" value={payment.is_paid ? "false" : "true"} />
        <button
          type="submit"
          aria-label={payment.is_paid ? "Отменить оплату" : "Отметить оплаченным"}
          className={`flex size-5 items-center justify-center rounded border transition ${
            payment.is_paid
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-emerald-600 hover:text-emerald-200"
          }`}
        >
          <Check className="size-3.5" />
        </button>
      </form>

      <span className="w-10 text-xs text-slate-400">{payment.percent}%</span>

      <span
        className={`w-32 text-sm font-medium ${
          payment.is_paid ? "text-slate-400 line-through" : "text-slate-900"
        }`}
      >
        {formatTenge(payment.amount)}
      </span>

      <span className={`text-sm ${overdue ? "font-medium text-red-700" : "text-slate-500"}`}>
        {payment.due_date ? formatDateRu(payment.due_date) : "дата не задана"}
        {overdue && " · просрочен"}
      </span>

      {payment.is_paid && (
        <span className="ml-auto text-xs font-medium text-emerald-700">оплачен</span>
      )}
    </li>
  );
}

export function ClientPackage({
  client,
  payments,
  services,
  positions,
}: {
  client: ClientWithSegment;
  payments: ClientPayment[];
  services: ClientService[];
  positions: PricePosition[];
}) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const proposalUrl = `/clients/${client.id}/proposal`;

  const totals = calcTotals(
    client.development_price,
    client.subscription_price,
    client.discount_percent,
  );
  const load = monthlyLoad(totals.subscriptionAfterDiscount, client.contract_months);

  const paidAmount = payments
    .filter((p) => p.is_paid)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  // Есть что показать, если задана хотя бы одна услуга (новая модель) либо
  // сохранился старый одиночный пакет (клиент заведён до расширения услуг).
  const hasPricing = services.length > 0 || !!client.package;
  const cityLabel = services[0] ? CITY_LABELS[services[0].city] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Package className="size-4 text-slate-400" />
          Пакет и договор
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil className="size-3.5" />
          {hasPricing ? "Изменить" : "Выбрать пакет"}
        </button>
      </div>

      {hasPricing ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {services.length > 0 ? (
              <>
                {services.map((service) => (
                  <span
                    key={service.id}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${PACKAGE_STYLES[service.package]}`}
                  >
                    {SERVICE_CATEGORY_LABELS[service.category]} · {PACKAGE_LABELS[service.package]}
                  </span>
                ))}
                {cityLabel && <span className="text-sm text-slate-500">{cityLabel}</span>}
              </>
            ) : (
              client.package && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${PACKAGE_STYLES[client.package]}`}
                >
                  {PACKAGE_LABELS[client.package]}
                </span>
              )
            )}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setPreview((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {preview ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                {preview ? "Скрыть предпросмотр" : "Предпросмотр КП"}
              </button>
              <a
                href={proposalUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-sm font-medium text-white transition hover:from-brand-dark hover:to-brand-dark"
              >
                <FileDown className="size-3.5" />
                Скачать КП
              </a>
            </div>
          </div>

          {preview && (
            <iframe
              src={proposalUrl}
              title="Предпросмотр коммерческого предложения"
              className="h-[600px] w-full rounded-lg border border-slate-200"
            />
          )}

          <dl className="grid gap-5 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Срок</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {client.contract_months} мес.
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Разработка
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {formatTenge(client.development_price)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Абонемент
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {formatTenge(client.subscription_price)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Скидка</dt>
              <dd
                className={`mt-1 text-sm font-medium ${
                  client.discount_percent > 0 ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                {client.discount_percent > 0 ? `${client.discount_percent}%` : "нет"}
              </dd>
            </div>
          </dl>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Груз — headline-метрика для финансовой сводки на дашборде:
                сколько клиент приносит каждый месяц, без учёта разовой разработки. */}
            <div className="rounded-lg border border-brand/20 bg-brand-soft px-3 py-2.5">
              <span className="block text-sm text-slate-600">Груз в месяц</span>
              <span className="text-lg font-semibold text-brand-dark">
                {formatTenge(load)}
                <span className="text-sm font-normal text-slate-500">/мес</span>
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="block text-sm text-slate-500">К оплате по договору</span>
              <span className="text-lg font-semibold text-slate-900">
                {formatTenge(totals.total)}
              </span>
              {client.discount_percent > 0 && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Скидка {client.discount_percent}%: экономия{" "}
                  {formatTenge(totals.discountAmount)}
                </p>
              )}
            </div>
          </div>

          {client.payment_scheme && payments.length > 0 && (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Wallet className="size-4 text-slate-400" />
                  {SCHEME_LABELS[client.payment_scheme]}
                </h3>
                <span className="text-xs text-slate-500">
                  Поступило {formatTenge(paidAmount)} из {formatTenge(totals.total)}
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Пакет не выбран. Срок договора — {client.contract_months} мес. по умолчанию.
        </p>
      )}

      {editing && (
        <PackageForm
          client={client}
          payments={payments}
          services={services}
          positions={positions}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
