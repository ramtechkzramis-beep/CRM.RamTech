import { describe, expect, it } from "vitest";
import {
  OUTCOMES_BY_TYPE,
  OUTCOME_LABELS,
  OUTCOME_TONE,
  TASK_TYPES,
  type TaskOutcome,
} from "./task-types";

describe("результаты задач", () => {
  it("у каждого типа задачи есть варианты результата", () => {
    for (const type of TASK_TYPES) {
      expect(OUTCOMES_BY_TYPE[type].length).toBeGreaterThan(0);
    }
  });

  it("у каждого результата есть подпись и тон", () => {
    // Иначе интерфейс молча покажет пустой значок вместо исхода.
    const all = Object.values(OUTCOMES_BY_TYPE).flat();

    for (const outcome of all) {
      expect(OUTCOME_LABELS[outcome]).toBeTruthy();
      expect(OUTCOME_TONE[outcome]).toBeTruthy();
    }
  });

  it("результаты не пересекаются между типами", () => {
    // Иначе «Отказ» от прозвона попал бы в список исходов встречи.
    const all = Object.values(OUTCOMES_BY_TYPE).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it("подписи заданы ровно для существующих результатов", () => {
    const declared = Object.keys(OUTCOME_LABELS) as TaskOutcome[];
    const used = Object.values(OUTCOMES_BY_TYPE).flat();

    expect(new Set(declared)).toEqual(new Set(used));
  });

  it("у встречи есть отмена и перенос — то, ради чего это делалось", () => {
    expect(OUTCOMES_BY_TYPE.meeting).toContain("meeting_cancelled");
    expect(OUTCOMES_BY_TYPE.meeting).toContain("meeting_rescheduled");
    expect(OUTCOME_LABELS.meeting_rescheduled).toBe("Перенесена");
  });

  it("отказ и срыв помечены как плохой исход, успех — как хороший", () => {
    expect(OUTCOME_TONE.call_refused).toBe("bad");
    expect(OUTCOME_TONE.meeting_no_show).toBe("bad");
    expect(OUTCOME_TONE.payment_paid).toBe("good");
    expect(OUTCOME_TONE.meeting_held).toBe("good");
  });
});
