import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { canSeeDashboard } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { StageFunnel } from "@/components/stage-funnel";
import { getActiveClients } from "@/lib/clients";
import { SEGMENTS, SEGMENT_LABELS, SEGMENT_STYLES, type Segment } from "@/lib/segments";
import {
  LOYALTY_CHANCE,
  LOYALTY_DESCRIPTIONS,
  LOYALTY_DOTS,
  LOYALTY_LABELS,
  LOYALTY_LEVELS,
  type LoyaltyLevel,
} from "@/lib/client-types";
import { summarizeClientMoney, summarizeClientMoneyBySegment } from "@/lib/payments";
import { formatTenge } from "@/lib/packages";
import { formatDateRu } from "@/lib/dates";

/** Цвета долей в полосе лояльности — те же, что у точек в списке. */
const LOYALTY_BARS: Record<LoyaltyLevel, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

function pluralClients(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "клиент";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "клиента";
  return "клиентов";
}

function StatCard({
  label,
  value,
  suffix,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  suffix?: string;
  note: string;
  tone?: "default" | "danger";
}) {
  const isDanger = tone === "danger";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p
        className={`flex items-center gap-1.5 text-sm ${
          isDanger ? "font-medium text-red-700" : "text-slate-500"
        }`}
      >
        {isDanger && <AlertTriangle className="size-4" />}
        {label}
      </p>
      <p
        className={`mt-1.5 text-[30px] font-bold leading-none ${
          isDanger ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
        {suffix && (
          <span
            className={`text-base font-normal ${isDanger ? "text-red-400" : "text-slate-400"}`}
          >
            {suffix}
          </span>
        )}
      </p>
      <p className="mt-2.5 text-sm text-slate-500">{note}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (!canSeeDashboard(profile.role)) {
    notFound();
  }

  const clients = await getActiveClients();

  const segmentCounts = SEGMENTS.reduce(
    (acc, segment) => {
      acc[segment] = clients.filter((c) => c.segment === segment).length;
      return acc;
    },
    {} as Record<Segment, number>,
  );

  const loyaltyCounts = {
    green: clients.filter((c) => c.loyalty === "green").length,
    yellow: clients.filter((c) => c.loyalty === "yellow").length,
    red: clients.filter((c) => c.loyalty === "red").length,
  };

  // Деньги считаем от тех же клиентов: груз — это абонемент после скидки,
  // делённый на срок договора.
  const money = summarizeClientMoney(clients);
  const moneyBySegment = summarizeClientMoneyBySegment(clients);
  const withoutPackage = clients.filter((c) => !c.subscription_price);

  // Доля груза под угрозой — сама сумма ни о чём не говорит, пока не видно,
  // какая это часть общего.
  const atRiskShare =
    money.totalLoad > 0 ? Math.round((money.atRiskLoad / money.totalLoad) * 100) : 0;

  // Продление в ближайший месяц или уже просрочено — то, что горит.
  const renewals = clients
    .filter((c) => c.days_to_renewal !== null && c.days_to_renewal <= 30)
    .sort((a, b) => (a.days_to_renewal ?? 0) - (b.days_to_renewal ?? 0));

  const loyaltyBarTotal = LOYALTY_LEVELS.reduce(
    (sum, level) => sum + money.byLoyalty[level].load,
    0,
  );

  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow={`Клиентов в работе: ${clients.length}`} title="Дашборд" />

      {/* Деньги — сначала: сколько груза держим всего, сколько получим за
          весь срок и сколько под угрозой ухода. */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Общий груз"
          value={formatTenge(money.totalLoad)}
          suffix=" / мес"
          note="Стоимость месяца размещения по всем клиентам"
        />
        <StatCard
          label="Оплата по абонементам"
          value={formatTenge(money.totalSubscription)}
          note="Полная стоимость за весь срок размещения"
        />
        <StatCard
          label="Под угрозой ухода"
          value={formatTenge(money.atRiskLoad)}
          suffix=" / мес"
          note={`Груз клиентов жёлтого и красного сегментов — ${atRiskShare}% от общего`}
          tone="danger"
        />
      </div>

      {withoutPackage.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-900">
            <AlertTriangle className="size-4 shrink-0" />У {withoutPackage.length}{" "}
            {pluralClients(withoutPackage.length)} не указан абонемент —{" "}
            {withoutPackage.length === 1 ? "он не входит" : "они не входят"} в расчёт груза.
          </p>
          {/* Ведём сразу в карточку, когда клиент один: лишний шаг через
              список тут ничего не добавляет. */}
          <Link
            href={
              withoutPackage.length === 1
                ? `/clients/${withoutPackage[0].id}`
                : "/clients/active"
            }
            className="shrink-0 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Заполнить
          </Link>
        </div>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <StageFunnel clients={clients} />

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-[17px] font-semibold text-slate-900">Лояльность и груз</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Сколько денег приходится на каждый сегмент
            </p>

            {/* Полоса целиком — чтобы соотношение читалось без чтения цифр. */}
            {loyaltyBarTotal > 0 && (
              <div className="mt-4 flex h-2.5 gap-1 overflow-hidden rounded-full">
                {LOYALTY_LEVELS.map((level) => {
                  const share = (money.byLoyalty[level].load / loyaltyBarTotal) * 100;
                  if (share <= 0) return null;

                  return (
                    <span
                      key={level}
                      className={`${LOYALTY_BARS[level]} rounded-full`}
                      style={{ width: `${share}%` }}
                    />
                  );
                })}
              </div>
            )}

            <ul className="mt-4 space-y-1">
              {LOYALTY_LEVELS.map((level) => (
                <li key={level}>
                  <Link
                    href={`/clients/active?loyalty=${level}`}
                    title={`${LOYALTY_DESCRIPTIONS[level]}. Вероятность продления ${LOYALTY_CHANCE[level]}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 transition hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                      <span className={`size-2.5 shrink-0 rounded-full ${LOYALTY_DOTS[level]}`} />
                      <span className="font-medium">{LOYALTY_LABELS[level]}</span>
                      {loyaltyCounts[level] > 0 && (
                        <span className="text-slate-400">
                          · {loyaltyCounts[level]} {pluralClients(loyaltyCounts[level])}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {money.byLoyalty[level].load > 0
                        ? formatTenge(money.byLoyalty[level].load)
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
              {money.byLoyalty.none.count > 0 && (
                <li>
                  <Link
                    href="/clients/active"
                    title="Лояльность ещё не оценена"
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 transition hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="size-2.5 shrink-0 rounded-full border border-slate-300 bg-white" />
                      Без оценки
                      <span className="text-slate-400">
                        · {money.byLoyalty.none.count}{" "}
                        {pluralClients(money.byLoyalty.none.count)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-slate-500">
                      {money.byLoyalty.none.load > 0
                        ? formatTenge(money.byLoyalty.none.load)
                        : "—"}
                    </span>
                  </Link>
                </li>
              )}
            </ul>

            <p className="mt-3 text-xs text-slate-400">Суммы указаны за месяц</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-[17px] font-semibold text-slate-900">Сегменты ППС</h2>
            <p className="mt-0.5 text-sm text-slate-500">Сколько клиент с нами работает</p>

            <ul className="mt-4 space-y-2">
              {SEGMENTS.map((segment) => {
                const bucket = moneyBySegment.bySegment[segment];

                return (
                  <li key={segment}>
                    <Link
                      href={`/clients/active?segment=${segment}`}
                      className="block rounded-lg px-1 py-1 transition hover:bg-slate-50"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEGMENT_STYLES[segment]}`}
                        >
                          {SEGMENT_LABELS[segment]}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {segmentCounts[segment]}
                        </span>
                      </span>
                      {/* Груз и оплата — та же пара метрик, что и в верхних
                          плитках, только в разрезе срока работы. */}
                      {bucket.count > 0 && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Груз {formatTenge(bucket.load)}/мес · оплата{" "}
                          {formatTenge(bucket.subscription)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
          <AlertTriangle className="size-4 text-amber-500" />
          Ближайшие продления
        </h2>
        <p className="mt-0.5 mb-4 text-sm text-slate-500">
          Договор заканчивается в течение месяца или уже закончился
        </p>

        {renewals.length === 0 ? (
          <p className="text-sm text-slate-500">В ближайший месяц продлений нет.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {renewals.map((client) => {
              const days = client.days_to_renewal!;
              const overdue = days < 0;

              return (
                <li key={client.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/clients/${client.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:underline"
                  >
                    {client.name}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-400">{client.owner_name}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDateRu(client.renewal_date)}
                  </span>
                  <span
                    className={`w-32 shrink-0 text-right text-sm font-medium ${
                      overdue ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {overdue ? `просрочено на ${Math.abs(days)} дн.` : `через ${days} дн.`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
