import { describe, expect, it } from "vitest";
import { periodRange, shiftPeriod } from "./periods";

describe("periodRange — день", () => {
  it("границы дня — сам день", () => {
    expect(periodRange("day", "2026-07-16")).toEqual({
      from: "2026-07-16",
      to: "2026-07-16",
      label: "16 июля",
    });
  });
});

describe("periodRange — неделя", () => {
  it("неделя начинается с понедельника, а не с воскресенья", () => {
    // 16 июля 2026 — четверг.
    expect(periodRange("week", "2026-07-16")).toEqual({
      from: "2026-07-13", // понедельник
      to: "2026-07-19", // воскресенье
      label: "13 июля — 19 июля",
    });
  });

  it("воскресенье относится к уходящей неделе, а не к следующей", () => {
    const { from, to } = periodRange("week", "2026-07-19");
    expect(from).toBe("2026-07-13");
    expect(to).toBe("2026-07-19");
  });

  it("понедельник — первый день своей недели", () => {
    const { from } = periodRange("week", "2026-07-13");
    expect(from).toBe("2026-07-13");
  });

  it("неделя может пересекать границу месяца", () => {
    const { from, to } = periodRange("week", "2026-08-01");
    expect(from).toBe("2026-07-27");
    expect(to).toBe("2026-08-02");
  });
});

describe("periodRange — месяц", () => {
  it("месяц — от первого до последнего числа", () => {
    expect(periodRange("month", "2026-07-16")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
      label: "Июль 2026",
    });
  });

  it("февраль в високосный год заканчивается 29-м", () => {
    expect(periodRange("month", "2028-02-10").to).toBe("2028-02-29");
  });

  it("февраль в обычный год заканчивается 28-м", () => {
    expect(periodRange("month", "2026-02-10").to).toBe("2026-02-28");
  });
});

describe("shiftPeriod", () => {
  it("сдвигает день", () => {
    expect(shiftPeriod("day", "2026-07-16", -1)).toBe("2026-07-15");
    expect(shiftPeriod("day", "2026-07-16", 1)).toBe("2026-07-17");
  });

  it("сдвигает неделю", () => {
    expect(shiftPeriod("week", "2026-07-16", -1)).toBe("2026-07-09");
  });

  it("сдвигает месяц", () => {
    expect(shiftPeriod("month", "2026-07-16", 1)).toBe("2026-08-16");
  });

  it("переходит через границу года", () => {
    expect(shiftPeriod("day", "2027-01-01", -1)).toBe("2026-12-31");
    expect(shiftPeriod("month", "2026-12-15", 1)).toBe("2027-01-15");
  });

  it("не улетает в несуществующую дату при сдвиге месяца с 31-го", () => {
    // 31 марта минус месяц — в феврале нет 31-го, должно быть 28-е.
    expect(shiftPeriod("month", "2026-03-31", -1)).toBe("2026-02-28");
  });
});
