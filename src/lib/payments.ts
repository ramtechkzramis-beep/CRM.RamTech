/** Скидки, схемы оплаты и расчёт траншей. Без обращений к базе. */

import type { LoyaltyLevel } from "@/lib/client-types";
import { SEGMENTS, type Segment } from "@/lib/segments";

export type PaymentScheme = "full" | "split_50_50" | "split_30_30_40" | "kaspi";

export const PAYMENT_SCHEMES: PaymentScheme[] = [
  "full",
  "split_50_50",
  "split_30_30_40",
  "kaspi",
];

export const SCHEME_LABELS: Record<PaymentScheme, string> = {
  full: "Оплата целиком",
  split_50_50: "Транш 50/50",
  split_30_30_40: "Транш 30/30/40",
  kaspi: "Рассрочка Kaspi",
};

export const SCHEME_HINTS: Record<PaymentScheme, string> = {
  full: "Один платёж на всю сумму",
  split_50_50: "Два платежа: половина и половина",
  split_30_30_40: "Три платежа: 30%, 30% и 40%",
  kaspi: "Клиент гасит рассрочку банку, нам Kaspi платит сразу",
};

/** Доли платежей по схемам. Kaspi — один платёж: банк переводит всю сумму. */
export const SCHEME_SPLITS: Record<PaymentScheme, number[]> = {
  full: [100],
  split_50_50: [50, 50],
  split_30_30_40: [30, 30, 40],
  kaspi: [100],
};

export const MAX_DISCOUNT = 20;

export type PaymentPlanItem = {
  seq: number;
  percent: number;
  amount: number;
};

export type Totals = {
  /** Сумма по прайсу, без скидки. */
  base: number;
  /** Сколько сэкономил клиент. */
  discountAmount: number;
  /** Итого к оплате. */
  total: number;
  developmentAfterDiscount: number;
  subscriptionAfterDiscount: number;
};

/**
 * Итоги сделки со скидкой.
 * Скидка действует на всю сделку — и на разработку, и на абонемент.
 */
export function calcTotals(
  development: number | null,
  subscription: number | null,
  discountPercent: number,
): Totals {
  const dev = development ?? 0;
  const sub = subscription ?? 0;
  const base = dev + sub;

  const factor = 1 - clampDiscount(discountPercent) / 100;

  const developmentAfterDiscount = Math.round(dev * factor);
  const subscriptionAfterDiscount = Math.round(sub * factor);
  const total = developmentAfterDiscount + subscriptionAfterDiscount;

  return {
    base,
    discountAmount: base - total,
    total,
    developmentAfterDiscount,
    subscriptionAfterDiscount,
  };
}

export function clampDiscount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), MAX_DISCOUNT);
}

/**
 * «Груз» — месячная стоимость абонемента: сумма подписки после скидки,
 * поделённая на срок договора. Разработка сюда не входит — она разовая,
 * а груз показывает, сколько клиент приносит каждый месяц.
 *
 * Пример: абонемент 300 000 ₸ на 3 месяца → груз 100 000 ₸/мес.
 */
export function monthlyLoad(subscriptionAfterDiscount: number, contractMonths: number): number {
  if (contractMonths <= 0) return 0;
  return Math.round(subscriptionAfterDiscount / contractMonths);
}

/**
 * Разбивка суммы на платежи по схеме.
 *
 * Остаток от округления добавляем к последнему платежу: иначе сумма траншей
 * не сойдётся с итогом, и клиент недоплатит пару тенге, а в отчётах будет
 * вечное расхождение.
 */
export function buildPaymentPlan(
  total: number,
  scheme: PaymentScheme,
): PaymentPlanItem[] {
  const splits = SCHEME_SPLITS[scheme];

  const items = splits.map((percent, index) => ({
    seq: index + 1,
    percent,
    amount: Math.round((total * percent) / 100),
  }));

  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  const remainder = total - sum;

  if (remainder !== 0 && items.length > 0) {
    items[items.length - 1].amount += remainder;
  }

  return items;
}

export function isPaymentScheme(value: string | null): value is PaymentScheme {
  return !!value && (PAYMENT_SCHEMES as string[]).includes(value);
}

export type ClientMoneyInput = {
  development_price: number | null;
  subscription_price: number | null;
  discount_percent: number;
  contract_months: number;
  loyalty: LoyaltyLevel | null;
};

/**
 * Одна денежная корзина — общий вид для группировки и по лояльности,
 * и по сегменту ППС: один и тот же расчёт, разный ключ группировки.
 */
export type ClientMoneyBucket = {
  count: number;
  /** Сумма груза (МRR) клиентов этой группы. */
  load: number;
  /** Полная сумма абонемента за весь срок — сколько «оплаты» лежит в группе. */
  subscription: number;
  /** Сумма разработки (разово) клиентов этой группы. */
  development: number;
};

export type LoyaltyKey = LoyaltyLevel | "none";

export type MoneyBreakdown = {
  totalLoad: number;
  totalDevelopment: number;
  /** Полная сумма абонемента за весь срок договора — не делённая на месяцы. */
  totalSubscription: number;
  byLoyalty: Record<LoyaltyKey, ClientMoneyBucket>;
  /** Груз клиентов жёлтого и красного сегментов — то, что можно потерять. */
  atRiskLoad: number;
};

function emptyBucket(): ClientMoneyBucket {
  return { count: 0, load: 0, subscription: 0, development: 0 };
}

/**
 * Деньги по клиентам, разложенные по цвету лояльности.
 *
 * Груз считается только у клиентов с заполненным абонементом и сроком —
 * без пакета включать их в сумму не из чего, а не полагающийся на данные
 * ноль будет тише любой ошибки округления.
 */
export function summarizeClientMoney(clients: ClientMoneyInput[]): MoneyBreakdown {
  const byLoyalty: Record<LoyaltyKey, ClientMoneyBucket> = {
    green: emptyBucket(),
    yellow: emptyBucket(),
    red: emptyBucket(),
    none: emptyBucket(),
  };

  let totalLoad = 0;
  let totalDevelopment = 0;
  let totalSubscription = 0;

  for (const client of clients) {
    const totals = calcTotals(
      client.development_price,
      client.subscription_price,
      client.discount_percent,
    );
    const load = monthlyLoad(totals.subscriptionAfterDiscount, client.contract_months);

    const key: LoyaltyKey = client.loyalty ?? "none";
    byLoyalty[key].count += 1;
    byLoyalty[key].load += load;
    byLoyalty[key].subscription += totals.subscriptionAfterDiscount;
    byLoyalty[key].development += totals.developmentAfterDiscount;

    totalLoad += load;
    totalDevelopment += totals.developmentAfterDiscount;
    totalSubscription += totals.subscriptionAfterDiscount;
  }

  return {
    totalLoad,
    totalDevelopment,
    totalSubscription,
    byLoyalty,
    atRiskLoad: byLoyalty.yellow.load + byLoyalty.red.load,
  };
}

export type SegmentKey = Segment | "none";

export type SegmentMoneyBreakdown = {
  totalLoad: number;
  totalSubscription: number;
  bySegment: Record<SegmentKey, ClientMoneyBucket>;
};

export type ClientMoneyInputWithSegment = ClientMoneyInput & {
  /** null — ППС ещё не начался (проект не дошёл до «Одобрен»). */
  segment: Segment | null;
};

/**
 * Деньги по клиентам, разложенные по сегменту ППС — тот же расчёт, что и
 * summarizeClientMoney, но группировка по сроку работы, а не по лояльности.
 */
export function summarizeClientMoneyBySegment(
  clients: ClientMoneyInputWithSegment[],
): SegmentMoneyBreakdown {
  const bySegment = Object.fromEntries(
    [...SEGMENTS, "none" as const].map((key) => [key, emptyBucket()]),
  ) as Record<SegmentKey, ClientMoneyBucket>;

  let totalLoad = 0;
  let totalSubscription = 0;

  for (const client of clients) {
    const totals = calcTotals(
      client.development_price,
      client.subscription_price,
      client.discount_percent,
    );
    const load = monthlyLoad(totals.subscriptionAfterDiscount, client.contract_months);

    const key: SegmentKey = client.segment ?? "none";
    bySegment[key].count += 1;
    bySegment[key].load += load;
    bySegment[key].subscription += totals.subscriptionAfterDiscount;
    bySegment[key].development += totals.developmentAfterDiscount;

    totalLoad += load;
    totalSubscription += totals.subscriptionAfterDiscount;
  }

  return { totalLoad, totalSubscription, bySegment };
}
