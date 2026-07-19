import { describe, expect, it } from "vitest";
import { monthInCycle, segmentFor, segmentForMonth } from "./segments";

// Все проверки от фиксированной «сегодня», иначе тесты начнут падать со временем.
const TODAY = new Date(2026, 6, 16); // 16 июля 2026

describe("monthInCycle", () => {
  it("в день старта клиент на первом месяце", () => {
    expect(monthInCycle("2026-07-16", TODAY)).toBe(1);
  });

  it("считает полные месяцы, а не календарные границы", () => {
    // Старт 20 июня: 16 июля полный месяц ещё не прошёл — это всё ещё 1-й месяц.
    expect(monthInCycle("2026-06-20", TODAY)).toBe(1);
    // Старт 15 июня: 16 июля месяц уже прошёл — начался 2-й.
    expect(monthInCycle("2026-06-15", TODAY)).toBe(2);
  });

  it("возвращает null, если даты старта нет", () => {
    expect(monthInCycle(null, TODAY)).toBeNull();
  });

  it("возвращает null для даты старта в будущем", () => {
    expect(monthInCycle("2026-08-01", TODAY)).toBeNull();
  });
});

describe("segmentFor — договор на 6 месяцев (по умолчанию)", () => {
  it("1-й месяц — ППС1", () => {
    expect(segmentFor("2026-07-01", TODAY)).toBe("ППС1");
  });

  it("2–4-й месяц — ППС2", () => {
    expect(segmentFor("2026-06-01", TODAY)).toBe("ППС2"); // 2-й месяц
    expect(segmentFor("2026-05-01", TODAY)).toBe("ППС2"); // 3-й
    expect(segmentFor("2026-04-01", TODAY)).toBe("ППС2"); // 4-й
  });

  it("5-й месяц — ППС3", () => {
    expect(segmentFor("2026-03-01", TODAY)).toBe("ППС3");
  });

  it("6-й месяц — ППС4", () => {
    expect(segmentFor("2026-02-01", TODAY)).toBe("ППС4");
  });

  it("после 6-го месяца — просрочка продления", () => {
    expect(segmentFor("2026-01-01", TODAY)).toBe("overdue");
  });

  it("границы сегментов не пропускают клиента мимо ППС", () => {
    // Переход ППС2 → ППС3 ровно на 5-м месяце.
    expect(segmentFor("2026-03-16", TODAY)).toBe("ППС3");
    expect(segmentFor("2026-03-17", TODAY)).toBe("ППС2");
    // Переход ППС4 → просрочка ровно после 6 месяцев.
    expect(segmentFor("2026-01-16", TODAY)).toBe("overdue");
    expect(segmentFor("2026-01-17", TODAY)).toBe("ППС4");
  });
});

describe("segmentFor — договор на 12 месяцев", () => {
  it("годовой клиент не уезжает в просрочку на 7-м месяце", () => {
    // Ровно та ошибка, ради которой всё переделывалось.
    expect(segmentFor("2026-01-01", TODAY, 12)).toBe("ППС2"); // 7-й месяц
  });

  it("ППС2 растягивается на 2–10-й месяц", () => {
    expect(segmentFor("2026-06-01", TODAY, 12)).toBe("ППС2"); // 2-й
    expect(segmentFor("2025-10-01", TODAY, 12)).toBe("ППС2"); // 10-й
  });

  it("ППС3 — 11-й месяц, ППС4 — 12-й", () => {
    expect(segmentFor("2025-09-01", TODAY, 12)).toBe("ППС3"); // 11-й
    expect(segmentFor("2025-08-01", TODAY, 12)).toBe("ППС4"); // 12-й
  });

  it("просрочка только после 12-го месяца", () => {
    expect(segmentFor("2025-07-01", TODAY, 12)).toBe("overdue"); // 13-й
  });
});

describe("segmentFor — договор на 3 месяца", () => {
  it("1-й месяц — ППС1, 2-й — ППС3, 3-й — ППС4", () => {
    expect(segmentFor("2026-07-01", TODAY, 3)).toBe("ППС1");
    expect(segmentFor("2026-06-01", TODAY, 3)).toBe("ППС3"); // предпоследний
    expect(segmentFor("2026-05-01", TODAY, 3)).toBe("ППС4"); // последний
  });

  it("просрочка после 3-го месяца", () => {
    expect(segmentFor("2026-04-01", TODAY, 3)).toBe("overdue");
  });
});

describe("segmentForMonth — прямая проверка формулы", () => {
  it("ППС4 всегда последний месяц договора", () => {
    expect(segmentForMonth(3, 3)).toBe("ППС4");
    expect(segmentForMonth(6, 6)).toBe("ППС4");
    expect(segmentForMonth(12, 12)).toBe("ППС4");
  });

  it("ППС3 всегда предпоследний", () => {
    expect(segmentForMonth(2, 3)).toBe("ППС3");
    expect(segmentForMonth(5, 6)).toBe("ППС3");
    expect(segmentForMonth(11, 12)).toBe("ППС3");
  });

  it("первый месяц всегда ППС1, даже при коротком договоре", () => {
    expect(segmentForMonth(1, 3)).toBe("ППС1");
    expect(segmentForMonth(1, 12)).toBe("ППС1");
  });
});
