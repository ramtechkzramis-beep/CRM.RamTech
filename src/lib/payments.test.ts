import { describe, expect, it } from "vitest";
import {
  buildPaymentPlan,
  calcTotals,
  clampDiscount,
  monthlyLoad,
  summarizeClientMoney,
  summarizeClientMoneyBySegment,
  type ClientMoneyInput,
  type ClientMoneyInputWithSegment,
} from "./payments";

function client(over: Partial<ClientMoneyInput>): ClientMoneyInput {
  return {
    development_price: 0,
    subscription_price: 300_000,
    discount_percent: 0,
    contract_months: 3,
    loyalty: null,
    ...over,
  };
}

function clientWithSegment(
  over: Partial<ClientMoneyInputWithSegment>,
): ClientMoneyInputWithSegment {
  return { ...client({}), segment: null, ...over };
}

describe("clampDiscount", () => {
  it("держит скидку в пределах 0–20%", () => {
    expect(clampDiscount(10)).toBe(10);
    expect(clampDiscount(25)).toBe(20);
    expect(clampDiscount(-5)).toBe(0);
  });

  it("не падает на мусоре", () => {
    expect(clampDiscount(NaN)).toBe(0);
  });
});

describe("calcTotals", () => {
  it("считает сумму без скидки", () => {
    const t = calcTotals(265_000, 737_500, 0);

    expect(t.base).toBe(1_002_500);
    expect(t.total).toBe(1_002_500);
    expect(t.discountAmount).toBe(0);
  });

  it("скидка действует и на разработку, и на абонемент", () => {
    // Business на 6 месяцев со скидкой 10%.
    const t = calcTotals(265_000, 737_500, 10);

    expect(t.developmentAfterDiscount).toBe(238_500);
    expect(t.subscriptionAfterDiscount).toBe(663_750);
    expect(t.total).toBe(902_250);
    expect(t.discountAmount).toBe(100_250);
  });

  it("максимальная скидка 20%", () => {
    const t = calcTotals(100_000, 100_000, 20);
    expect(t.total).toBe(160_000);
    expect(t.discountAmount).toBe(40_000);
  });

  it("скидка выше 20% не применяется", () => {
    const t = calcTotals(100_000, 100_000, 50);
    expect(t.total).toBe(160_000);
  });

  it("не падает, если цены не заданы", () => {
    const t = calcTotals(null, null, 10);
    expect(t.base).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe("monthlyLoad", () => {
  it("300 000 на 3 месяца — груз 100 000 в месяц (пример из разговора)", () => {
    expect(monthlyLoad(300_000, 3)).toBe(100_000);
  });

  it("делит абонемент на срок договора", () => {
    expect(monthlyLoad(737_500, 6)).toBe(122_917);
    expect(monthlyLoad(1_119_990, 12)).toBe(93_333);
  });

  it("без срока договора груз ноль, а не деление на ноль", () => {
    expect(monthlyLoad(300_000, 0)).toBe(0);
  });

  it("без абонемента груз ноль", () => {
    expect(monthlyLoad(0, 6)).toBe(0);
  });
});

describe("summarizeClientMoney", () => {
  it("пример из разговора: разработка 150 000, абонемент 300 000 на 3 мес — груз 100 000", () => {
    const result = summarizeClientMoney([
      client({ development_price: 150_000, subscription_price: 300_000, contract_months: 3 }),
    ]);

    expect(result.totalLoad).toBe(100_000);
    expect(result.totalDevelopment).toBe(150_000);
  });

  it("раскладывает груз по цвету лояльности", () => {
    const result = summarizeClientMoney([
      client({ loyalty: "green", subscription_price: 600_000, contract_months: 6 }), // 100 000
      client({ loyalty: "yellow", subscription_price: 300_000, contract_months: 3 }), // 100 000
      client({ loyalty: "red", subscription_price: 150_000, contract_months: 3 }), // 50 000
    ]);

    expect(result.byLoyalty.green.load).toBe(100_000);
    expect(result.byLoyalty.yellow.load).toBe(100_000);
    expect(result.byLoyalty.red.load).toBe(50_000);
    expect(result.totalLoad).toBe(250_000);
  });

  it("клиент без оценки лояльности попадает в корзину «none», а не теряется", () => {
    const result = summarizeClientMoney([client({ loyalty: null })]);
    expect(result.byLoyalty.none.count).toBe(1);
    expect(result.byLoyalty.none.load).toBe(100_000);
  });

  it("оплата — полная сумма абонемента за весь срок, не делённая на месяцы", () => {
    // Абонемент 300 000 на 3 месяца: оплата — все 300 000, груз — 100 000/мес.
    const result = summarizeClientMoney([
      client({ subscription_price: 300_000, contract_months: 3 }),
    ]);

    expect(result.totalSubscription).toBe(300_000);
    expect(result.totalLoad).toBe(100_000);
  });

  it("оплата учитывает скидку", () => {
    const result = summarizeClientMoney([
      client({ subscription_price: 300_000, contract_months: 3, discount_percent: 10 }),
    ]);

    expect(result.totalSubscription).toBe(270_000);
  });

  it("под угрозой — это жёлтый и красный вместе, зелёный туда не входит", () => {
    const result = summarizeClientMoney([
      client({ loyalty: "green", subscription_price: 900_000, contract_months: 3 }), // 300 000
      client({ loyalty: "yellow", subscription_price: 300_000, contract_months: 3 }), // 100 000
      client({ loyalty: "red", subscription_price: 300_000, contract_months: 3 }), // 100 000
    ]);

    expect(result.atRiskLoad).toBe(200_000);
  });

  it("скидка учитывается в грузе, а не только в общей сумме", () => {
    const result = summarizeClientMoney([
      client({ subscription_price: 300_000, contract_months: 3, discount_percent: 10 }),
    ]);

    // 300 000 со скидкой 10% = 270 000, делим на 3 месяца = 90 000.
    expect(result.totalLoad).toBe(90_000);
  });

  it("на пустом списке всё в нулях, а не падает", () => {
    const result = summarizeClientMoney([]);
    expect(result.totalLoad).toBe(0);
    expect(result.atRiskLoad).toBe(0);
    expect(result.byLoyalty.green.count).toBe(0);
  });
});

describe("summarizeClientMoneyBySegment", () => {
  it("раскладывает груз и оплату по сегментам ППС", () => {
    const result = summarizeClientMoneyBySegment([
      clientWithSegment({ segment: "ППС1", subscription_price: 300_000, contract_months: 3 }),
      clientWithSegment({ segment: "ППС1", subscription_price: 300_000, contract_months: 3 }),
      clientWithSegment({ segment: "ППС3", subscription_price: 600_000, contract_months: 6 }),
    ]);

    expect(result.bySegment["ППС1"].count).toBe(2);
    expect(result.bySegment["ППС1"].load).toBe(200_000); // 100 000 × 2
    expect(result.bySegment["ППС1"].subscription).toBe(600_000); // 300 000 × 2

    expect(result.bySegment["ППС3"].count).toBe(1);
    expect(result.bySegment["ППС3"].load).toBe(100_000);
    expect(result.bySegment["ППС3"].subscription).toBe(600_000);

    expect(result.bySegment["ППС2"].count).toBe(0);
  });

  it("клиент без ППС (ещё не одобрен) попадает в корзину «none»", () => {
    const result = summarizeClientMoneyBySegment([clientWithSegment({ segment: null })]);

    expect(result.bySegment.none.count).toBe(1);
    expect(result.bySegment.none.load).toBe(100_000);
  });

  it("итоги совпадают с суммой по всем сегментам", () => {
    const result = summarizeClientMoneyBySegment([
      clientWithSegment({ segment: "ППС1", subscription_price: 300_000, contract_months: 3 }),
      clientWithSegment({ segment: "overdue", subscription_price: 600_000, contract_months: 6 }),
    ]);

    expect(result.totalLoad).toBe(200_000);
    expect(result.totalSubscription).toBe(900_000);
  });

  it("на пустом списке всё в нулях", () => {
    const result = summarizeClientMoneyBySegment([]);
    expect(result.totalLoad).toBe(0);
    expect(result.bySegment["ППС1"].count).toBe(0);
  });
});

describe("buildPaymentPlan", () => {
  it("оплата целиком — один платёж", () => {
    const plan = buildPaymentPlan(1_000_000, "full");
    expect(plan).toEqual([{ seq: 1, percent: 100, amount: 1_000_000 }]);
  });

  it("50/50 — два равных платежа", () => {
    const plan = buildPaymentPlan(1_000_000, "split_50_50");

    expect(plan).toHaveLength(2);
    expect(plan[0].amount).toBe(500_000);
    expect(plan[1].amount).toBe(500_000);
  });

  it("30/30/40 — три платежа в нужных долях", () => {
    const plan = buildPaymentPlan(1_000_000, "split_30_30_40");

    expect(plan.map((p) => p.amount)).toEqual([300_000, 300_000, 400_000]);
  });

  it("Kaspi — один платёж: банк переводит всю сумму", () => {
    const plan = buildPaymentPlan(902_250, "kaspi");
    expect(plan).toHaveLength(1);
    expect(plan[0].amount).toBe(902_250);
  });

  it("сумма траншей всегда сходится с итогом", () => {
    // 902 250 на три части не делится нацело — остаток идёт в последний платёж,
    // иначе в отчётах будет вечное расхождение на пару тенге.
    const total = 902_250;
    const plan = buildPaymentPlan(total, "split_30_30_40");

    expect(plan.reduce((acc, p) => acc + p.amount, 0)).toBe(total);
  });

  it("остаток от округления попадает в последний платёж", () => {
    const plan = buildPaymentPlan(100, "split_30_30_40");

    expect(plan.map((p) => p.amount)).toEqual([30, 30, 40]);
    expect(plan.reduce((acc, p) => acc + p.amount, 0)).toBe(100);
  });

  it("сходится и на некруглых суммах пополам", () => {
    const total = 1_002_501;
    const plan = buildPaymentPlan(total, "split_50_50");

    expect(plan.reduce((acc, p) => acc + p.amount, 0)).toBe(total);
  });
});
