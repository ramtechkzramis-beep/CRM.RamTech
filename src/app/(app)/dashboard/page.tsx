import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Wallet } from "lucide-react";
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
} from "@/lib/client-types";
import { summarizeClientMoney, summarizeClientMoneyBySegment } from "@/lib/payments";
import { formatTenge } from "@/lib/packages";
import { formatDateRu } from "@/lib/dates";

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
  // делённый на срок договора, разработка — разовая сумма отдельно.
  const money = summarizeClientMoney(clients);
  const moneyBySegment = summarizeClientMoneyBySegment(clients);
  const withoutPackage = clients.filter((c) => !c.subscription_price).length;

  // Продление в ближайший месяц или уже просрочено — то, что горит.
  const renewals = clients
    .filter((c) => c.days_to_renewal !== null && c.days_to_renewal <= 30)
    .sort((a, b) => (a.days_to_renewal ?? 0) - (b.days_to_renewal ?? 0));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Дашборд"
        subtitle={`Клиентов в работе: ${clients.length}`}
      />

      {/* Деньги — сначала: сколько груза (ежемесячный абонемент) держим всего,
          сколько в разовой разработке и сколько под угрозой ухода. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
            <Wallet className="size-3.5" />
            Общий груз
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatTenge(money.totalLoad)}
            <span className="text-sm font-normal text-slate-400">/мес</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Сколько стоит месяц размещения по всем клиентам
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Оплата</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatTenge(money.totalSubscription)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Полная стоимость абонемента за весь срок размещения
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-xs uppercase tracking-wide text-red-700">
            Под угрозой ухода
          </p>
          <p className="mt-1 text-2xl font-semibold text-red-800">
            {formatTenge(money.atRiskLoad)}
            <span className="text-sm font-normal text-red-500">/мес</span>
          </p>
          <p className="mt-1 text-xs text-red-600">
            Груз клиентов жёлтого и красного сегментов лояльности
          </p>
        </div>
      </div>

      {withoutPackage > 0 && (
        <p className="mb-6 text-xs text-slate-400">
          У {withoutPackage} клиентов не указан абонемент — они не входят в расчёт груза.
        </p>
      )}

      <div className="mb-6">
        <StageFunnel clients={clients} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Сегменты ППС</h2>
          <p className="mb-4 text-xs text-slate-500">Сколько клиент с нами работает</p>

          <ul className="space-y-1">
            {SEGMENTS.map((segment) => {
              const bucket = moneyBySegment.bySegment[segment];

              return (
                <li key={segment}>
                  <Link
                    href={`/clients/active?segment=${segment}`}
                    className="block rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
                  >
                    <span className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEGMENT_STYLES[segment]}`}
                      >
                        {SEGMENT_LABELS[segment]}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {segmentCounts[segment]}
                      </span>
                    </span>
                    {/* Груз и оплата — та же пара метрик, что и в верхних
                        плитках, только теперь в разрезе срока работы. */}
                    {bucket.count > 0 && (
                      <span className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Груз: {formatTenge(bucket.load)}/мес</span>
                        <span>Оплата: {formatTenge(bucket.subscription)}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Лояльность и груз
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Сколько денег стоит за каждым цветом
          </p>

          <ul className="space-y-2">
            {LOYALTY_LEVELS.map((level) => (
              <li key={level}>
                <Link
                  href={`/clients/active?loyalty=${level}`}
                  title={`${LOYALTY_DESCRIPTIONS[level]}. Вероятность продления ${LOYALTY_CHANCE[level]}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    <span className={`size-2.5 rounded-full ${LOYALTY_DOTS[level]}`} />
                    {LOYALTY_LABELS[level]}
                    <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">
                      {loyaltyCounts[level]}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {money.byLoyalty[level].load > 0
                      ? `${formatTenge(money.byLoyalty[level].load)}/мес`
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
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="size-2.5 rounded-full border border-slate-300 bg-white" />
                    Без оценки
                    <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">
                      {money.byLoyalty.none.count}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {money.byLoyalty.none.load > 0
                      ? `${formatTenge(money.byLoyalty.none.load)}/мес`
                      : "—"}
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <AlertTriangle className="size-4 text-amber-500" />
          Ближайшие продления
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Договор заканчивается в течение месяца или уже закончился
        </p>

        {renewals.length === 0 ? (
          <p className="text-sm text-slate-500">
            В ближайший месяц продлений нет.
          </p>
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
                  <span className="shrink-0 text-xs text-slate-400">
                    {client.owner_name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDateRu(client.renewal_date)}
                  </span>
                  <span
                    className={`w-32 shrink-0 text-right text-sm font-medium ${
                      overdue ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {overdue
                      ? `просрочено на ${Math.abs(days)} дн.`
                      : `через ${days} дн.`}
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
