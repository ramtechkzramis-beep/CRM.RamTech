import { describe, expect, it } from "vitest";
import { addDaysISO, todayISO } from "./dates";

describe("addDaysISO", () => {
  it("прибавляет день внутри месяца", () => {
    expect(addDaysISO("2026-07-16", 1)).toBe("2026-07-17");
  });

  it("переходит через границу месяца", () => {
    expect(addDaysISO("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("переходит через границу года", () => {
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("учитывает високосный год", () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("умеет вычитать дни", () => {
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("todayISO", () => {
  it("отдаёт местную дату, а не UTC", () => {
    // 23:30 по местному времени: наивный toISOString() в плюсовом поясе
    // отдал бы уже завтрашний день и сломал экран «Задачи на сегодня».
    const lateEvening = new Date(2026, 6, 16, 23, 30);
    expect(todayISO(lateEvening)).toBe("2026-07-16");
  });
});
