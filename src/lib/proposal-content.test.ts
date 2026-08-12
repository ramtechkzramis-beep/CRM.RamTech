import { describe, expect, it } from "vitest";
import { buildProposalViewModel, PROPOSAL_VALIDITY_DAYS } from "./proposal-content";

describe("buildProposalViewModel", () => {
  it("считает те же суммы, что и calcTotals/monthlyLoad — пример из разговора", () => {
    const model = buildProposalViewModel({
      clientName: "ТОО Ромашка",
      package: "business",
      contractMonths: 3,
      developmentPrice: 150_000,
      subscriptionPrice: 300_000,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    expect(model.totals.total).toBe(450_000);
    expect(model.load).toBe(100_000);
  });

  it("подставляет название и состав нужного тира", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "start",
      contractMonths: 3,
      developmentPrice: 159_000,
      subscriptionPrice: 255_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    expect(model.tierLabel).toBe("Старт");
    expect(model.tierFeatures.length).toBeGreaterThan(0);
    expect(model.tierIntro).toMatch(/малого бизнеса/i);
  });

  it("«Корпоративный» — общее название и для pro, и для enterprise", () => {
    expect(
      buildProposalViewModel({
        clientName: "Клиент",
        package: "pro",
        contractMonths: 6,
        developmentPrice: 0,
        subscriptionPrice: 0,
        discountPercent: 0,
        paymentScheme: null,
        issueDateISO: "2026-07-18",
      }).tierLabel,
    ).toBe("Корпоративный");

    expect(
      buildProposalViewModel({
        clientName: "Клиент",
        package: "enterprise",
        contractMonths: 6,
        developmentPrice: 0,
        subscriptionPrice: 0,
        discountPercent: 0,
        paymentScheme: null,
        issueDateISO: "2026-07-18",
      }).tierLabel,
    ).toBe("Корпоративный");
  });

  it("состав услуг и город попадают в compositionLabel/cityLabel", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "business",
      contractMonths: 6,
      developmentPrice: 400_000,
      subscriptionPrice: 900_000,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
      composition: [
        { category: "bot", package: "business" },
        { category: "crm", package: "start" },
      ],
      city: "almaty",
    });

    expect(model.compositionLabel).toBe("Чат-бот (Бизнес) + CRM (Старт)");
    expect(model.cityLabel).toBe("Алматы");
  });

  it("без переданного состава compositionLabel/cityLabel — null (старые клиенты без client_services)", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "start",
      contractMonths: 3,
      developmentPrice: 159_000,
      subscriptionPrice: 255_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    expect(model.compositionLabel).toBeNull();
    expect(model.cityLabel).toBeNull();
  });

  it(`срок действия — ровно ${PROPOSAL_VALIDITY_DAYS} дней от даты выгрузки`, () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "pro",
      contractMonths: 6,
      developmentPrice: 340_000,
      subscriptionPrice: 1_119_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    expect(model.issueDate).toBe("18.07.2026");
    expect(model.validUntil).toBe("01.08.2026");
  });

  it("без схемы оплаты график пуст, но не падает", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "enterprise",
      contractMonths: 12,
      developmentPrice: 500_000,
      subscriptionPrice: 3_190_990,
      discountPercent: 0,
      paymentScheme: null,
      issueDateISO: "2026-07-18",
    });

    expect(model.paymentPlan).toEqual([]);
    expect(model.paymentSchemeLabel).toBeNull();
    expect(model.paymentSchemeHint).toBeNull();
  });

  it("полная оплата — один платёж на всю сумму, с понятной подписью", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "start",
      contractMonths: 3,
      developmentPrice: 159_000,
      subscriptionPrice: 255_990,
      discountPercent: 0,
      paymentScheme: "full",
      issueDateISO: "2026-07-18",
    });

    expect(model.paymentPlan).toHaveLength(1);
    expect(model.paymentPlan[0].percent).toBe(100);
    expect(model.paymentPlan[0].amount).toBe(model.totals.total);
    expect(model.paymentSchemeLabel).toBe("Оплата целиком");
    expect(model.paymentSchemeHint).toBe("Один платёж на всю сумму");
  });

  it("схема оплаты разбивает итог на транши, как в калькуляторе клиента", () => {
    const model = buildProposalViewModel({
      clientName: "Клиент",
      package: "business",
      contractMonths: 6,
      developmentPrice: 265_000,
      subscriptionPrice: 737_500,
      discountPercent: 10,
      paymentScheme: "split_30_30_40",
      issueDateISO: "2026-07-18",
    });

    expect(model.paymentSchemeLabel).toBe("Транш 30/30/40");
    expect(model.paymentPlan.map((p) => p.percent)).toEqual([30, 30, 40]);
    expect(model.paymentPlan.reduce((acc, p) => acc + p.amount, 0)).toBe(model.totals.total);
  });
});
