import { describe, expect, it } from "vitest";
import {
  byEmployee,
  planStatsFor,
  totalsFor,
  type DoneAction,
  type PlannedTask,
} from "./summary-types";

function planned(over: Partial<PlannedTask>): PlannedTask {
  return {
    id: crypto.randomUUID(),
    status: "done",
    outcome: "call_reached",
    due_date: "2026-07-16",
    assignee_id: "u1",
    ...over,
  };
}

function action(over: Partial<DoneAction>): DoneAction {
  return {
    id: crypto.randomUUID(),
    title: "Задача",
    type: "call",
    outcome: "call_reached",
    outcome_note: null,
    completed_at: "2026-07-16T10:00:00Z",
    assignee_id: "u1",
    assignee_name: "Айгуль",
    client_id: null,
    client_name: null,
    ...over,
  };
}

describe("totalsFor", () => {
  it("считает по типам действий", () => {
    const totals = totalsFor([
      action({ type: "call" }),
      action({ type: "call" }),
      action({ type: "meeting" }),
      action({ type: "payment" }),
    ]);

    expect(totals.call).toBe(2);
    expect(totals.meeting).toBe(1);
    expect(totals.payment).toBe(1);
    expect(totals.service).toBe(0);
    expect(totals.total).toBe(4);
  });

  it("на пустом списке даёт нули, а не пустоту", () => {
    const totals = totalsFor([]);
    expect(totals.total).toBe(0);
    expect(totals.call).toBe(0);
  });
});

describe("planStatsFor", () => {
  it("разделяет выполненные, отменённые и незакрытые", () => {
    const stats = planStatsFor([
      planned({ status: "done", outcome: "meeting_held" }),
      planned({ status: "done", outcome: "call_reached" }),
      planned({ status: "done", outcome: "meeting_cancelled" }),
      planned({ status: "done", outcome: "call_refused" }),
      planned({ status: "open", outcome: null }),
    ]);

    expect(stats.planned).toBe(5);
    expect(stats.completed).toBe(2);
    expect(stats.cancelled).toBe(2);
    expect(stats.pending).toBe(1);
  });

  it("коэффициент считается от всего плана, а не от закрытых", () => {
    // 1 выполнена, 1 сорвана: 50%, а не 100%. Сорванная встреча —
    // тоже невыполненный план, коэффициент не должен льстить.
    const stats = planStatsFor([
      planned({ status: "done", outcome: "meeting_held" }),
      planned({ status: "done", outcome: "meeting_cancelled" }),
    ]);

    expect(stats.rate).toBe(50);
  });

  it("незакрытые задачи снижают коэффициент", () => {
    const stats = planStatsFor([
      planned({ status: "done", outcome: "call_reached" }),
      planned({ status: "open", outcome: null }),
      planned({ status: "open", outcome: null }),
      planned({ status: "open", outcome: null }),
    ]);

    expect(stats.rate).toBe(25);
  });

  it("промежуточные исходы считаются выполнением", () => {
    // «Перезвонить» и «Перенесена» — работа сделана, контакт состоялся.
    const stats = planStatsFor([
      planned({ status: "done", outcome: "call_callback" }),
      planned({ status: "done", outcome: "meeting_rescheduled" }),
    ]);

    expect(stats.completed).toBe(2);
    expect(stats.rate).toBe(100);
  });

  it("без планов коэффициент null, а не ноль", () => {
    // 0% означало бы «провалил план», хотя плана не было вовсе.
    const stats = planStatsFor([]);
    expect(stats.rate).toBeNull();
    expect(stats.planned).toBe(0);
  });

  it("округляет до целых процентов", () => {
    const stats = planStatsFor([
      planned({ status: "done", outcome: "call_reached" }),
      planned({ status: "open", outcome: null }),
      planned({ status: "open", outcome: null }),
    ]);

    expect(stats.rate).toBe(33);
  });
});

describe("byEmployee", () => {
  it("разбивает действия по сотрудникам", () => {
    const rows = byEmployee([
      action({ assignee_id: "u1", assignee_name: "Айгуль", type: "call" }),
      action({ assignee_id: "u1", assignee_name: "Айгуль", type: "meeting" }),
      action({ assignee_id: "u2", assignee_name: "Данияр", type: "call" }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Айгуль");
    expect(rows[0].totals.total).toBe(2);
    expect(rows[1].totals.call).toBe(1);
  });

  it("сортирует по количеству действий — активные сверху", () => {
    const rows = byEmployee([
      action({ assignee_id: "u1", assignee_name: "Айгуль" }),
      action({ assignee_id: "u2", assignee_name: "Данияр" }),
      action({ assignee_id: "u2", assignee_name: "Данияр" }),
      action({ assignee_id: "u2", assignee_name: "Данияр" }),
    ]);

    expect(rows[0].name).toBe("Данияр");
    expect(rows[0].totals.total).toBe(3);
  });

  it("не падает, если у сотрудника нет имени", () => {
    const rows = byEmployee([action({ assignee_id: "u9", assignee_name: null })]);
    expect(rows[0].name).toBe("Без имени");
  });

  it("считает счётчики независимо для каждого сотрудника", () => {
    const rows = byEmployee([
      action({ assignee_id: "u1", assignee_name: "Айгуль", type: "call" }),
      action({ assignee_id: "u2", assignee_name: "Данияр", type: "meeting" }),
    ]);

    const aigul = rows.find((r) => r.name === "Айгуль")!;
    const daniyar = rows.find((r) => r.name === "Данияр")!;

    expect(aigul.totals.call).toBe(1);
    expect(aigul.totals.meeting).toBe(0);
    expect(daniyar.totals.meeting).toBe(1);
    expect(daniyar.totals.call).toBe(0);
  });
});
