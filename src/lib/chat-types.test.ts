import { describe, expect, it } from "vitest";
import { messageStatus } from "./chat-types";

describe("messageStatus", () => {
  it("без доставки и прочтения — отправлено", () => {
    expect(
      messageStatus({ created_at: "2026-07-16T10:00:00Z", delivered_at: null }, null),
    ).toBe("sent");
  });

  it("доставлено, но собеседник ещё не читал — доставлено", () => {
    expect(
      messageStatus(
        { created_at: "2026-07-16T10:00:00Z", delivered_at: "2026-07-16T10:00:01Z" },
        null,
      ),
    ).toBe("delivered");
  });

  it("собеседник прочитал позже отправки — прочитано", () => {
    expect(
      messageStatus(
        { created_at: "2026-07-16T10:00:00Z", delivered_at: "2026-07-16T10:00:01Z" },
        "2026-07-16T10:05:00Z",
      ),
    ).toBe("read");
  });

  it("собеседник читал ДО этого сообщения — ещё не прочитано, только доставлено", () => {
    // Прочитал старые сообщения, это отправлено уже после — не должно
    // задним числом засчитаться прочитанным.
    expect(
      messageStatus(
        { created_at: "2026-07-16T10:10:00Z", delivered_at: "2026-07-16T10:10:01Z" },
        "2026-07-16T10:05:00Z",
      ),
    ).toBe("delivered");
  });

  it("момент прочтения ровно равен отправке — считается прочитанным", () => {
    expect(
      messageStatus(
        { created_at: "2026-07-16T10:00:00Z", delivered_at: "2026-07-16T10:00:00Z" },
        "2026-07-16T10:00:00Z",
      ),
    ).toBe("read");
  });

  it("прочитано важнее доставлено, даже если delivered_at пуст", () => {
    // На практике не случается (нельзя прочитать недоставленное), но функция
    // не должна падать и должна отдавать приоритет более сильному статусу.
    expect(
      messageStatus(
        { created_at: "2026-07-16T10:00:00Z", delivered_at: null },
        "2026-07-16T10:05:00Z",
      ),
    ).toBe("read");
  });
});
