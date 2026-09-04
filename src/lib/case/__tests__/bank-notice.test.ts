import { describe, expect, it } from "vitest";
import {
  isValidPastOrPresentIso,
  parseBankNoticeDate,
  toLocalDateTimeInput,
} from "../bank-notice";

describe("bank notification timestamp", () => {
  it("requires the citizen to enter an actual date", () => {
    expect(parseBankNoticeDate("", new Date("2026-09-04T12:00:00+05:30"))).toEqual({
      ok: false,
      reason: "required",
    });
    expect(parseBankNoticeDate("not-a-date", new Date("2026-09-04T12:00:00+05:30"))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("normalises a local wall-clock value without replacing it with click-time", () => {
    const result = parseBankNoticeDate(
      "2026-09-03T14:35",
      new Date("2026-09-04T12:00:00+05:30"),
    );

    expect(result).toEqual({ ok: true, iso: "2026-09-03T09:05:00.000Z" });
    if (result.ok) expect(toLocalDateTimeInput(result.iso)).toBe("2026-09-03T14:35");
  });

  it("rejects future values in both UI parsing and store validation", () => {
    const now = new Date("2026-09-04T12:00:00+05:30");
    expect(parseBankNoticeDate("2026-09-04T12:01", now)).toEqual({
      ok: false,
      reason: "future",
    });
    expect(isValidPastOrPresentIso("2026-09-04T06:31:00.000Z", now)).toBe(false);
    expect(isValidPastOrPresentIso("2026-09-04T06:30:00.000Z", now)).toBe(true);
  });
});
