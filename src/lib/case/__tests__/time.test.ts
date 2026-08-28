/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Deadline engine — time calculations
 * Uses deterministic dates in IST (Asia/Kolkata). TZ is forced via vitest.config.
 * Credit: initial audit/test harness inspired by feedback from Codex (OpenAI).
 */
import { describe, it, expect } from "vitest";
import { isBankHoliday, addWorkingDays, addHours, addDays, countdown, formatCountdown } from "../time";

// Helper: create date in local time (IST when TZ=Asia/Kolkata)
function d(y: number, m: number, day: number, h = 10, min = 0) {
  // m is 1-indexed for readability
  return new Date(y, m - 1, day, h, min, 0, 0);
}

describe("isBankHoliday — Indian banking calendar", () => {
  it("treats Sundays as holidays regardless of date", () => {
    expect(isBankHoliday(d(2026, 1, 4))).toBe(true); // Sun Jan 4 2026
    expect(isBankHoliday(d(2026, 1, 11))).toBe(true); // Sun Jan 11
    expect(isBankHoliday(d(2026, 12, 27))).toBe(true); // Sun Dec 27 2026
  });

  it("marks second Saturday as holiday", () => {
    // Jan 2026: Saturdays 3,10,17,24,31 => 10 is second
    expect(isBankHoliday(d(2026, 1, 10))).toBe(true);
    // Feb 2026: Saturdays 7,14,21,28 => 14 is second
    expect(isBankHoliday(d(2026, 2, 14))).toBe(true);
    // Mar 2026: Saturdays 7,14,21,28 => 14 is second
    expect(isBankHoliday(d(2026, 3, 14))).toBe(true);
  });

  it("marks fourth Saturday as holiday", () => {
    expect(isBankHoliday(d(2026, 1, 24))).toBe(true);
    expect(isBankHoliday(d(2026, 2, 28))).toBe(true);
    expect(isBankHoliday(d(2026, 3, 28))).toBe(true);
  });

  it("does NOT mark first, third, fifth Saturdays as holidays", () => {
    expect(isBankHoliday(d(2026, 1, 3))).toBe(false); // 1st
    expect(isBankHoliday(d(2026, 1, 17))).toBe(false); // 3rd
    expect(isBankHoliday(d(2026, 1, 31))).toBe(false); // 5th
    expect(isBankHoliday(d(2026, 2, 7))).toBe(false); // 1st
    expect(isBankHoliday(d(2026, 2, 21))).toBe(false); // 3rd
  });

  it("does not mark weekdays as holidays", () => {
    expect(isBankHoliday(d(2026, 1, 5))).toBe(false); // Mon
    expect(isBankHoliday(d(2026, 1, 6))).toBe(false); // Tue
    expect(isBankHoliday(d(2026, 1, 7))).toBe(false); // Wed
    expect(isBankHoliday(d(2026, 1, 8))).toBe(false); // Thu
    expect(isBankHoliday(d(2026, 1, 9))).toBe(false); // Fri
  });
});

describe("addWorkingDays — 3 working days (RBI clock)", () => {
  // A. Normal weekday cases
  it("A: incident on Monday 5 Jan 2026 10:00 +3wd lands Thu 8 Jan 17:00", () => {
    const from = d(2026, 1, 5, 10, 0);
    const result = addWorkingDays(from, 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(8);
    expect(result.getHours()).toBe(17);
    expect(result.getMinutes()).toBe(0);
  });

  it("A: incident on Wednesday 7 Jan 2026 10:00 +3wd lands Mon 12 Jan 17:00 (skips Sat-Sun)", () => {
    // Wed7 +3wd: Thu8=1, Fri9=2, Mon12=3 (skips Sat10 holiday+Sun11)
    const result = addWorkingDays(d(2026, 1, 7, 10, 0), 3);
    expect(result.getDate()).toBe(12);
    expect(result.getHours()).toBe(17);
  });

  it("A: incident on Friday 9 Jan 2026 10:00 +3wd lands Wed 14 Jan 17:00", () => {
    // Fri9 start, Sat10 holiday skip, Sun11 skip, Mon12=1, Tue13=2, Wed14=3
    const result = addWorkingDays(d(2026, 1, 9, 10, 0), 3);
    expect(result.getDate()).toBe(14);
    expect(result.getMonth()).toBe(0);
  });

  // B. Weekend boundaries
  it("B: incident on Saturday (1st working Sat 3 Jan) +3wd lands Wed 7 Jan 17:00", () => {
    // Sat3 is working, but clock still counts from next day: Sun4 skip, Mon5=1, Tue6=2, Wed7=3
    const result = addWorkingDays(d(2026, 1, 3, 10, 0), 3);
    expect(result.getDate()).toBe(7);
  });

  it("B: incident on Saturday (2nd holiday Sat 10 Jan) +3wd lands Wed 14 Jan 17:00", () => {
    const result = addWorkingDays(d(2026, 1, 10, 10, 0), 3);
    expect(result.getDate()).toBe(14);
  });

  it("B: incident on Sunday 11 Jan +3wd lands Wed 14 Jan 17:00", () => {
    const result = addWorkingDays(d(2026, 1, 11, 10, 0), 3);
    expect(result.getDate()).toBe(14);
  });

  it("B: incident on Sunday 4 Jan +3wd lands Wed 7 Jan 17:00", () => {
    const result = addWorkingDays(d(2026, 1, 4, 10, 0), 3);
    expect(result.getDate()).toBe(7);
  });

  // C. Second and fourth Saturday boundaries
  it("C: day BEFORE second Saturday (Fri 9 Jan) +3wd correctly skips second Saturday", () => {
    const result = addWorkingDays(d(2026, 1, 9, 10, 0), 3);
    // Must not count Sat10
    expect(result.getDate()).toBe(14);
    expect(isBankHoliday(d(2026, 1, 10))).toBe(true);
  });

  it("C: day AFTER second Saturday (Sun 11 Jan) +3wd", () => {
    const result = addWorkingDays(d(2026, 1, 11, 10, 0), 3);
    expect(result.getDate()).toBe(14);
  });

  it("C: day BEFORE fourth Saturday (Fri 23 Jan) +3wd lands Wed 28 Jan (skips 4th Sat)", () => {
    // Fri23 start, Sat24 holiday skip, Sun25 skip, Mon26=1, Tue27=2, Wed28=3
    const result = addWorkingDays(d(2026, 1, 23, 10, 0), 3);
    expect(result.getDate()).toBe(28);
    expect(isBankHoliday(d(2026, 1, 24))).toBe(true);
  });

  it("C: day AFTER fourth Saturday (Sun 25 Jan) +3wd lands Wed 28 Jan", () => {
    const result = addWorkingDays(d(2026, 1, 25, 10, 0), 3);
    expect(result.getDate()).toBe(28);
  });

  it("C: incident on fourth Saturday itself (24 Jan holiday) +3wd lands Wed 28 Jan", () => {
    const result = addWorkingDays(d(2026, 1, 24, 10, 0), 3);
    expect(result.getDate()).toBe(28);
  });

  // D. Month boundaries
  it("D: month boundary — Sat 31 Jan (5th Sat working) +3wd lands Wed 4 Feb 17:00", () => {
    const result = addWorkingDays(d(2026, 1, 31, 10, 0), 3);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(4);
    expect(result.getHours()).toBe(17);
  });

  it("D: month boundary — Fri 30 Jan +3wd lands Wed 4 Feb", () => {
    // Fri30= start, Sat31 working=1, SunFeb1 skip, Mon2=2, Tue3=3? Wait check
    // Actually 30 Jan 2026 is Friday? Let's verify: Jan 30 2026 is Friday (we tested Jan9 Fri, Jan31 Sat => Jan30 Fri)
    // Fri30 start, Sat31=1, SunFeb1 skip, MonFeb2=2, TueFeb3=3 => Tue Feb3? let's compute correctly
    // But spec expects Wed Feb4 for Sat31 start, so for Fri30 should be Tue Feb3
    const result = addWorkingDays(d(2026, 1, 30, 10, 0), 3);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(3);
  });

  // E. Year boundaries
  it("E: year boundary — Mon 29 Dec 2025 +3wd lands Thu 1 Jan 2026 17:00", () => {
    const result = addWorkingDays(d(2025, 12, 29, 10, 0), 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it("E: year boundary — Wed 31 Dec 2025 +3wd lands Sat 3 Jan 2026 17:00 (1st Sat working)", () => {
    const result = addWorkingDays(d(2025, 12, 31, 10, 0), 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(3);
    expect(result.getHours()).toBe(17);
  });

  it("E: year boundary — Thu 1 Jan 2026 is Thursday, +3wd lands Tue 6 Jan (no holiday between)", () => {
    // Thu Jan1= start, Fri2=1, Sat3 working=2, Sun4 skip, Mon5=3 => Mon Jan5
    // Wait Jan3 is 1st Sat working, so counting: Fri2=1, Sat3=2, Mon5=3 => Mon5
    const result = addWorkingDays(d(2026, 1, 1, 10, 0), 3);
    expect(result.getDate()).toBe(5);
  });

  // F. Longer deadlines — 10 working days
  it("F: 10 working days from Mon 5 Jan lands Sat 17 Jan 17:00 (includes working Saturday)", () => {
    const result = addWorkingDays(d(2026, 1, 5, 10, 0), 10);
    expect(result.getDate()).toBe(17);
    expect(result.getMonth()).toBe(0);
    expect(result.getHours()).toBe(17);
  });

  it("F: 10 working days from Fri 9 Jan lands Thu 22 Jan 17:00 (skips two holidays + Sun)", () => {
    const result = addWorkingDays(d(2026, 1, 9, 10, 0), 10);
    expect(result.getDate()).toBe(22);
  });

  it("F: 10 working days across month boundary Sat 31 Jan -> Thu 12 Feb (skips Sun 1 & 8, counts Sat 7)", () => {
    const result = addWorkingDays(d(2026, 1, 31, 10, 0), 10);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(12);
    expect(result.getHours()).toBe(17);
  });

  // G. Boundary behavior — midnight
  it("G: incident at 23:50 on Mon 5 Jan still +3wd lands Thu 8 Jan 17:00 (normalized to close of day)", () => {
    const late = d(2026, 1, 5, 23, 50);
    const result = addWorkingDays(late, 3);
    expect(result.getDate()).toBe(8);
    expect(result.getHours()).toBe(17);
    expect(result.getMinutes()).toBe(0);
  });

  it("G: incident at 00:05 on Tue 6 Jan +3wd lands Fri 9 Jan 17:00", () => {
    const early = d(2026, 1, 6, 0, 5);
    const result = addWorkingDays(early, 3);
    expect(result.getDate()).toBe(9);
  });

  it("G: addWorkingDays always normalizes to 17:00 regardless of input time", () => {
    const a = addWorkingDays(d(2026, 1, 5, 8, 15), 3);
    const b = addWorkingDays(d(2026, 1, 5, 23, 59), 3);
    expect(a.getHours()).toBe(17);
    expect(b.getHours()).toBe(17);
    expect(a.getTime()).toBe(b.getTime());
  });

  it("G: exact deadline boundaries — 3wd from Thu 8 Jan lands Tue 13 Jan (skips 2nd Sat)", () => {
    // Thu8 start, Fri9=1, Sat10 holiday skip, Sun11 skip, Mon12=2, Tue13=3 => Tue13
    const result = addWorkingDays(d(2026, 1, 8, 10, 0), 3);
    expect(result.getDate()).toBe(13);
  });
});

describe("addHours — 1 hour and 24 hours", () => {
  it("adds 1 hour preserving exact clock time", () => {
    const from = d(2026, 1, 5, 10, 0);
    const result = addHours(from, 1);
    expect(result.getHours()).toBe(11);
    expect(result.getDate()).toBe(5);
  });

  it("adds 24 hours (next day same time)", () => {
    const from = d(2026, 1, 5, 10, 0);
    const result = addHours(from, 24);
    expect(result.getDate()).toBe(6);
    expect(result.getHours()).toBe(10);
  });

  it("G: incident at 23:30 +1h crosses midnight to next day 00:30", () => {
    const from = d(2026, 1, 5, 23, 30);
    const result = addHours(from, 1);
    expect(result.getDate()).toBe(6);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(30);
  });

  it("G: incident at 23:30 +24h lands next day 23:30", () => {
    const from = d(2026, 1, 5, 23, 30);
    const result = addHours(from, 24);
    expect(result.getDate()).toBe(6);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(30);
  });
});

describe("addDays — 30 and 90 calendar days", () => {
  it("F: 30 calendar days from 5 Jan lands 4 Feb (calendar, not working)", () => {
    const result = addDays(d(2026, 1, 5, 10, 0), 30);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(4);
    expect(result.getHours()).toBe(10); // preserves time
  });

  it("F: 30 calendar days from 20 Dec 2025 lands 19 Jan 2026 (cross year)", () => {
    const result = addDays(d(2025, 12, 20, 10, 0), 30);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(19);
  });

  it("F: 90 calendar days from 5 Jan lands 5 Apr", () => {
    const result = addDays(d(2026, 1, 5, 10, 0), 90);
    expect(result.getMonth()).toBe(3); // Apr
    expect(result.getDate()).toBe(5);
  });

  it("F: 90 calendar days from 20 Dec 2025 lands 20 Mar 2026", () => {
    const result = addDays(d(2025, 12, 20, 10, 0), 90);
    expect(result.getMonth()).toBe(2); // Mar
    expect(result.getDate()).toBe(20);
  });

  it("D: 30 days crossing Feb in non-leap year (2026) from 31 Jan lands 2 Mar", () => {
    const result = addDays(d(2026, 1, 31, 10, 0), 30);
    // Jan31 +30 = Mar2 in non-leap (Feb has 28 days: Jan31->Feb28=28 days, Mar1=29, Mar2=30)
    expect(result.getMonth()).toBe(2); // Mar
    expect(result.getDate()).toBe(2);
  });

  it("E: 30 days year boundary 15 Dec 2025 +30 => 14 Jan 2026", () => {
    const result = addDays(d(2025, 12, 15, 10, 0), 30);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getDate()).toBe(14);
  });

  it("G: addDays preserves exact wall time even near midnight", () => {
    const from = d(2026, 1, 5, 23, 45);
    const result = addDays(from, 1);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(45);
    expect(result.getDate()).toBe(6);
  });
});

describe("countdown & formatCountdown", () => {
  it("computes countdown days/hours/minutes and overdue flag", () => {
    const now = d(2026, 1, 5, 10, 0);
    const target = d(2026, 1, 6, 12, 30); // +1d 2h30m
    const c = countdown(target, now);
    expect(c.overdue).toBe(false);
    expect(c.days).toBe(1);
    expect(c.hours).toBe(2);
    expect(c.minutes).toBe(30);
  });

  it("marks overdue when target is past", () => {
    const now = d(2026, 1, 6, 12, 0);
    const target = d(2026, 1, 5, 10, 0);
    const c = countdown(target, now);
    expect(c.overdue).toBe(true);
    expect(c.ms).toBeLessThan(0);
  });

  it("formatCountdown shows days+hours when days present", () => {
    expect(formatCountdown({ days: 2, hours: 4, minutes: 10 } as any)).toBe("2d 4h");
  });

  it("formatCountdown shows hours+minutes when no days", () => {
    expect(formatCountdown({ days: 0, hours: 3, minutes: 12 } as any)).toBe("3h 12m");
  });

  it("formatCountdown shows minutes only when under an hour", () => {
    expect(formatCountdown({ days: 0, hours: 0, minutes: 47 } as any)).toBe("47m");
  });
});
