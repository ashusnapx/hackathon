import { describe, expect, it } from "vitest";

import { calendarDaysBetween, daysLeftFor, workingDaysBetween } from "../days-left";

describe("counting the days somebody actually has", () => {
  it("skips the weekend in a working-day count", () => {
    // Friday to Monday is one working day, not three. Getting this wrong in
    // the other direction tells somebody a window is open when it has shut.
    const friday = new Date("2026-09-04T10:00:00+05:30");
    const monday = new Date("2026-09-07T10:00:00+05:30");
    expect(workingDaysBetween(friday, monday)).toBe(1);
    expect(calendarDaysBetween(friday, monday)).toBe(3);
  });

  it("treats every Saturday as closed", () => {
    // Indian banks open on the first, third and fifth Saturday and close on
    // the second and fourth. That is not modelled, and both are counted as
    // closed on purpose: the error can then only ever under-count the time
    // available, never promise a day that does not exist.
    const thu = new Date("2026-09-03T10:00:00+05:30");
    const nextThu = new Date("2026-09-10T10:00:00+05:30");
    expect(workingDaysBetween(thu, nextThu)).toBe(5);
  });

  it("does not depend on the hour of the day", () => {
    const earlyMon = new Date("2026-09-07T00:30:00+05:30");
    const lateMon = new Date("2026-09-07T23:30:00+05:30");
    const wed = new Date("2026-09-09T12:00:00+05:30");
    expect(calendarDaysBetween(earlyMon, wed)).toBe(calendarDaysBetween(lateMon, wed));
  });

  it("counts nothing when the date has already passed", () => {
    const later = new Date("2026-09-10T10:00:00+05:30");
    const earlier = new Date("2026-09-01T10:00:00+05:30");
    expect(workingDaysBetween(later, earlier)).toBe(0);
    expect(calendarDaysBetween(later, earlier)).toBe(-9);
  });
});

describe("the badge on a track", () => {
  const track = (deadline: Date | null, opts: { working?: boolean; state?: string } = {}) => ({
    def: { id: "bank-notice", workingDayEstimate: opts.working ?? false },
    state: opts.state ?? "due",
    deadline,
    opensAt: null,
    finalDeadline: deadline,
    dateKind: "deadline",
    msLeft: null,
  }) as unknown as Parameters<typeof daysLeftFor>[0];

  const now = new Date("2026-09-07T09:00:00+05:30"); // a Monday

  it("counts calendar days for a calendar rule", () => {
    expect(daysLeftFor(track(new Date("2026-09-10T09:00:00+05:30")), now))
      .toMatchObject({ days: 3, working: false, tone: "soon" });
  });

  it("counts working days for a working-day rule, skipping the weekend", () => {
    // Monday to the following Monday is five working days, not seven. Showing
    // seven would tell somebody they had two days that do not exist.
    expect(daysLeftFor(track(new Date("2026-09-14T09:00:00+05:30"), { working: true }), now))
      .toMatchObject({ days: 5, working: true });
  });

  it("says today rather than zero", () => {
    expect(daysLeftFor(track(new Date("2026-09-07T18:00:00+05:30")), now)?.tone).toBe("today");
  });

  it("counts lateness in plain days once the date has gone", () => {
    // Late is said in calendar days even under a working-day rule: nothing
    // turns on the distinction any more, and it is the easier sentence.
    expect(daysLeftFor(track(new Date("2026-09-04T09:00:00+05:30"), { working: true }), now))
      .toMatchObject({ days: -3, working: false, tone: "gone" });
  });

  it("shows no count for a track with no statutory date", () => {
    // Most tracks are urgent without being time-barred. Giving them a
    // countdown would manufacture a legal cliff that does not exist.
    expect(daysLeftFor(track(null), now)).toBeNull();
  });

  it("shows no count once the track is done", () => {
    expect(daysLeftFor(track(new Date("2026-09-10T09:00:00+05:30"), { state: "done" }), now)).toBeNull();
  });
});
