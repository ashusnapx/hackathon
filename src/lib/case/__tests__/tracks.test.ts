/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Track deadlines — integration with time engine
 * Verifies all 10 tracks preserve intended behavior (regression) + edge cases.
 * Credit: test structure reviewed with assistance from Codex (OpenAI) due to token limits on primary model.
 */
import { describe, it, expect } from "vitest";
import { TRACKS, TRACK_BY_ID, liveTracks, nextAction, upcomingDeadline, isFinancial } from "../tracks";
import { addWorkingDays, addHours } from "../time";
import type { CaseFile } from "../types";

function d(y: number, m: number, day: number, h = 10, min = 0): Date {
  return new Date(y, m - 1, day, h, min, 0, 0);
}

function iso(y: number, m: number, day: number, h = 10, min = 0): string {
  return d(y, m, day, h, min).toISOString();
}

// Minimal case factory — only fields needed for deadline calc
function makeCase(overrides: Partial<CaseFile> = {}): CaseFile {
  const base: CaseFile = {
    id: "test-id",
    ref: "KVC-TEST-TEST",
    createdAt: iso(2026, 1, 5, 9, 0),
    language: "en",
    rawStatement: "test statement that is long enough to not be empty for the purpose of testing",
    triage: {
      categoryId: "financial-fraud",
      subcategoryId: "upi",
      confidence: 0.9,
      incidentAt: iso(2026, 1, 5, 10, 0),
      applicableTracks: [
        "helpline",
        "ncrp",
        "bank-notice",
        "bank-credit",
        "fir",
        "chakshu",
        "mrm",
        "ombudsman",
        "bank-resolution",
        "legal-aid",
      ],
      urgency: "critical",
    },
    entities: { upiIds: [], phones: [], accounts: [], refs: [], urls: [], emails: [], handles: [], apps: [] },
    incidentAt: iso(2026, 1, 5, 10, 0),
    bankAlertAt: undefined,
    amount: 50000,
    txns: [],
    victim: { name: "Test", phone: "9999999999", state: "Delhi", district: "Central" },
    bank: { name: "SBI", last4: "1234" },
    suspect: { phones: [], upiIds: [], accounts: [], urls: [], handles: [] },
    evidenceText: "",
    files: [],
    tracks: [],
    docs: {},
    events: [],
  };
  return { ...base, ...overrides, triage: overrides.triage ? { ...base.triage, ...overrides.triage } as any : base.triage, bank: { ...base.bank, ...(overrides.bank || {}) }, victim: { ...base.victim, ...(overrides.victim || {}) } } as CaseFile;
}

describe("TRACKS registry — regression all 10 tracks exist", () => {
  it("has exactly 10 tracks with expected ids", () => {
    expect(TRACKS.map((t) => t.id)).toEqual([
      "helpline",
      "ncrp",
      "bank-notice",
      "fir",
      "chakshu",
      "bank-credit",
      "mrm",
      "ombudsman",
      "bank-resolution",
      "legal-aid",
    ]);
  });

  it("TRACK_BY_ID map resolves every track", () => {
    for (const t of TRACKS) expect(TRACK_BY_ID.get(t.id)).toBeDefined();
  });
});

describe("helpline — 1 hour (first hour)", () => {
  it("H-regression: deadline is incidentAt +1h", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const deadline = TRACK_BY_ID.get("helpline")!.deadline(c)!;
    expect(deadline.getTime()).toBe(addHours(d(2026, 1, 5, 10, 0), 1).getTime());
  });

  it("A: Monday incident 10:00 => helpline due 11:00 same day", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("helpline")!.deadline(c)!;
    expect(dl.getHours()).toBe(11);
    expect(dl.getDate()).toBe(5);
  });

  it("G: near midnight 23:30 +1h crosses to next day 00:30", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 23, 30) });
    const dl = TRACK_BY_ID.get("helpline")!.deadline(c)!;
    expect(dl.getDate()).toBe(6);
    expect(dl.getHours()).toBe(0);
    expect(dl.getMinutes()).toBe(30);
  });

  it("falls back to triage.incidentAt when incidentAt missing", () => {
    const c = makeCase({ incidentAt: undefined, triage: { categoryId: "financial-fraud", confidence: 0.9, incidentAt: iso(2026, 1, 7, 14, 0), applicableTracks: ["helpline"], urgency: "high" } as any });
    c.createdAt = iso(2026, 1, 1, 9, 0);
    const dl = TRACK_BY_ID.get("helpline")!.deadline(c)!;
    expect(dl.getDate()).toBe(7);
    expect(dl.getHours()).toBe(15);
  });

  it("falls back to createdAt when no incident time", () => {
    const c = makeCase({ incidentAt: undefined, triage: { categoryId: "other", confidence: 0.5, applicableTracks: ["helpline"], urgency: "moderate" } as any });
    c.triage!.incidentAt = undefined;
    c.createdAt = iso(2026, 1, 10, 9, 0);
    const dl = TRACK_BY_ID.get("helpline")!.deadline(c)!;
    expect(dl.getHours()).toBe(10);
    expect(dl.getDate()).toBe(10);
  });
});

describe("ncrp — 24 hours", () => {
  it("H-regression: deadline is incident +24h", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("ncrp")!.deadline(c)!;
    expect(dl.getTime()).toBe(addHours(d(2026, 1, 5, 10, 0), 24).getTime());
  });

  it("A: Wednesday incident => due Thursday same time", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 7, 10, 0) });
    const dl = TRACK_BY_ID.get("ncrp")!.deadline(c)!;
    expect(dl.getDate()).toBe(8);
    expect(dl.getHours()).toBe(10);
  });

  it("E: 24h crossing year — 31 Dec 23:00 => 1 Jan 23:00 +1 year", () => {
    const c = makeCase({ incidentAt: iso(2025, 12, 31, 23, 0) });
    const dl = TRACK_BY_ID.get("ncrp")!.deadline(c)!;
    expect(dl.getFullYear()).toBe(2026);
    expect(dl.getMonth()).toBe(0);
    expect(dl.getDate()).toBe(1);
    expect(dl.getHours()).toBe(23);
  });
});

describe("bank-notice — 3 working days (RBI zero-liability clock)", () => {
  it("H-regression: uses bankAlertAt when present", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 6, 9, 0), incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getTime()).toBe(addWorkingDays(d(2026, 1, 6, 9, 0), 3).getTime());
  });

  it("prefers bankAlertAt over incidentAt (conservative fallback)", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 6, 9, 0), incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    // If it used incidentAt (5 Jan), +3wd would be Thu8; using bankAlertAt 6 Jan => Fri9? Let's check
    // 6 Jan Tue +3wd: Wed7=1, Thu8=2, Fri9=3 => Fri9
    expect(dl.getDate()).toBe(9);
  });

  it("falls back to incidentAt when bankAlertAt absent", () => {
    const c = makeCase({ bankAlertAt: undefined, incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getDate()).toBe(8); // Mon5 +3wd = Thu8
  });

  it("A: Monday alert => Thu 17:00", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 5, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getDate()).toBe(8);
    expect(dl.getHours()).toBe(17);
  });

  it("B: Friday alert skips weekend => Wed", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 9, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getDate()).toBe(14);
  });

  it("C: second Saturday boundary — Fri 9 Jan alert skips Sat 10 holiday", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 9, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getDate()).toBe(14);
  });

  it("D: month boundary — 31 Jan alert => 4 Feb", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 31, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getMonth()).toBe(1);
    expect(dl.getDate()).toBe(4);
  });

  it("E: year boundary — 29 Dec 2025 alert => 1 Jan 2026", () => {
    const c = makeCase({ bankAlertAt: iso(2025, 12, 29, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getFullYear()).toBe(2026);
    expect(dl.getDate()).toBe(1);
  });

  it("G: midnight alert 00:05 still normalized to 17:00", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 5, 0, 5) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getHours()).toBe(17);
  });
});

describe("bank-credit — 10 working days (requires bank-notice done)", () => {
  it("H-regression: null when bank-notice not yet done", () => {
    const c = makeCase();
    // no tracks, no bank.notifiedAt
    expect(TRACK_BY_ID.get("bank-credit")!.deadline(c)).toBeNull();
  });

  it("uses bank.notifiedAt when track not marked", () => {
    const notified = iso(2026, 1, 5, 10, 0);
    const c = makeCase({ bank: { name: "SBI", notifiedAt: notified } as any });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getTime()).toBe(addWorkingDays(d(2026, 1, 5, 10, 0), 10).getTime());
  });

  it("prefers tracks.doneAt for bank-notice over bank.notifiedAt", () => {
    const trackDone = iso(2026, 1, 6, 10, 0);
    const bankNotified = iso(2026, 1, 5, 10, 0);
    const c = makeCase({ bank: { name: "SBI", notifiedAt: bankNotified } as any, tracks: [{ id: "bank-notice", doneAt: trackDone }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getTime()).toBe(addWorkingDays(d(2026, 1, 6, 10, 0), 10).getTime());
  });

  it("F: 10wd from Mon 5 Jan => Sat 17 Jan 17:00", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getDate()).toBe(17);
    expect(dl.getHours()).toBe(17);
  });

  it("E: 10wd crossing year — 29 Dec 2025 => 9 Jan 2026", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2025, 12, 29, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getFullYear()).toBe(2026);
    expect(dl.getMonth()).toBe(0);
    expect(dl.getDate()).toBe(9);
  });
});

describe("ombudsman — 30 calendar days", () => {
  it("H-regression: null when not notified", () => {
    const c = makeCase();
    expect(TRACK_BY_ID.get("ombudsman")!.deadline(c)).toBeNull();
  });

  it("F: 30 days from Mon 5 Jan => Wed 4 Feb", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }] });
    const dl = TRACK_BY_ID.get("ombudsman")!.deadline(c)!;
    expect(dl.getDate()).toBe(4);
    expect(dl.getMonth()).toBe(1);
  });

  it("E: 30 days year crossing — 20 Dec 2025 => 19 Jan 2026", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2025, 12, 20, 10, 0) }] });
    const dl = TRACK_BY_ID.get("ombudsman")!.deadline(c)!;
    expect(dl.getFullYear()).toBe(2026);
    expect(dl.getMonth()).toBe(0);
    expect(dl.getDate()).toBe(19);
  });

  it("preserves wall time (not 17:00)", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 9, 30) }] });
    const dl = TRACK_BY_ID.get("ombudsman")!.deadline(c)!;
    expect(dl.getHours()).toBe(9);
    expect(dl.getMinutes()).toBe(30);
  });
});

describe("bank-resolution — 90 calendar days", () => {
  it("H-regression: null when not notified", () => {
    expect(TRACK_BY_ID.get("bank-resolution")!.deadline(makeCase())).toBeNull();
  });

  it("F: 90 days from 5 Jan => 5 Apr", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-resolution")!.deadline(c)!;
    expect(dl.getMonth()).toBe(3);
    expect(dl.getDate()).toBe(5);
  });

  it("E: 90 days Dec 20 2025 => 20 Mar 2026", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2025, 12, 20, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-resolution")!.deadline(c)!;
    expect(dl.getMonth()).toBe(2);
    expect(dl.getDate()).toBe(20);
  });
});

describe("ASAP tracks — no fixed deadline", () => {
  it("H-regression: fir, chakshu, mrm, legal-aid have null deadlines", () => {
    const c = makeCase();
    expect(TRACK_BY_ID.get("fir")!.deadline(c)).toBeNull();
    expect(TRACK_BY_ID.get("chakshu")!.deadline(c)).toBeNull();
    expect(TRACK_BY_ID.get("mrm")!.deadline(c)).toBeNull();
    expect(TRACK_BY_ID.get("legal-aid")!.deadline(c)).toBeNull();
  });
});

describe("liveTracks + helpers — regression", () => {
  it("marks financialOnly tracks as na for non-financial case", () => {
    const c = makeCase({
      amount: 0,
      triage: { categoryId: "social-media", confidence: 0.9, applicableTracks: ["ncrp", "fir", "chakshu", "legal-aid"], urgency: "moderate" } as any,
    });
    const live = liveTracks(c);
    const helpline = live.find((t) => t.def.id === "helpline")!;
    expect(helpline.state).toBe("na");
    const bankNotice = live.find((t) => t.def.id === "bank-notice")!;
    expect(bankNotice.state).toBe("na");
  });

  it("blockedBy => upcoming until prerequisite done", () => {
    const c = makeCase(); // no bank-notice done
    const live = liveTracks(c);
    const credit = live.find((t) => t.def.id === "bank-credit")!;
    expect(credit.state).toBe("upcoming");
  });

  it("after bank-notice done, dependent clocks become due (not upcoming)", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }] });
    // Need now before deadlines expire
    const now = d(2026, 1, 6, 9, 0);
    const live = liveTracks(c, now);
    const credit = live.find((t) => t.def.id === "bank-credit")!;
    expect(credit.state).toBe("due");
  });

  it("marks missed when deadline past and not done", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const now = d(2026, 1, 5, 12, 0); // 2h after incident, helpline (1h) should be missed
    const live = liveTracks(c, now);
    const heli = live.find((t) => t.def.id === "helpline")!;
    expect(heli.state).toBe("missed");
  });

  it("nextAction prioritizes missed over due", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0), bankAlertAt: iso(2026, 1, 5, 10, 0) });
    const now = d(2026, 1, 5, 12, 0);
    const next = nextAction(c, now)!;
    expect(next.state).toBe("missed");
    expect(next.def.id).toBe("helpline");
  });

  it("isFinancial true when triage includes bank-notice", () => {
    const c = makeCase();
    expect(isFinancial(c)).toBe(true);
  });

  it("upcomingDeadline skips done/na and returns soonest future", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const now = d(2026, 1, 5, 9, 0);
    const up = upcomingDeadline(c, now);
    expect(up).not.toBeNull();
    expect(up!.def.id).toBe("helpline");
  });
});
