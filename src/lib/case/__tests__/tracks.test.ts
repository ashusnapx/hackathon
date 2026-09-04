/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Track deadlines — integration with time engine
 * Verifies all 10 tracks preserve intended behavior (regression) + edge cases.
 * Credit: test structure reviewed with assistance from Codex (OpenAI) due to token limits on primary model.
 */
import { describe, it, expect } from "vitest";
import { TRACKS, TRACK_BY_ID, liveTracks, nextAction, upcomingDeadline, isFinancial } from "../tracks";
import { addWorkingDays } from "../time";
import { assessRbiEligibility } from "@/lib/legal/rbi";
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

  it("marks only the RBI-circular 10- and 90-day tracks as conditional", () => {
    const credit = TRACK_BY_ID.get("bank-credit")!;
    const resolution = TRACK_BY_ID.get("bank-resolution")!;

    expect(credit.requiresRbiUnauthorisedTransaction).toBe(true);
    expect(credit.source?.id).toBe("RBI/2017-18/15");
    expect(credit.source?.provisions).toContain("9");
    expect(resolution.requiresRbiUnauthorisedTransaction).toBe(true);
    expect(resolution.source?.id).toBe("RBI/2017-18/15");
    expect(resolution.source?.provisions).toContain("10");
  });
});

describe("helpline — immediate action, not a nationwide one-hour deadline", () => {
  it("has no fixed deadline", () => {
    const track = TRACK_BY_ID.get("helpline")!;

    expect(track.deadline(makeCase())).toBeNull();
    expect(track.source?.url).toBe("https://www.cybercrime.gov.in/Accept.aspx");
  });

  it("remains due instead of becoming missed for an older incident", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const helpline = liveTracks(c, d(2026, 1, 8, 10, 0)).find(
      (track) => track.def.id === "helpline",
    )!;

    expect(helpline.state).toBe("due");
    expect(helpline.deadline).toBeNull();
  });
});

describe("NCRP — report promptly, not a nationwide 24-hour deadline", () => {
  it("has no fixed deadline", () => {
    const track = TRACK_BY_ID.get("ncrp")!;

    expect(track.deadline(makeCase())).toBeNull();
    expect(track.source?.url).toBe("https://www.cybercrime.gov.in/Accept.aspx");
  });

  it("remains due instead of becoming missed for an older incident", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0) });
    const ncrp = liveTracks(c, d(2026, 2, 5, 10, 0)).find(
      (track) => track.def.id === "ncrp",
    )!;

    expect(ncrp.state).toBe("due");
    expect(ncrp.deadline).toBeNull();
  });
});

describe("bank-notice — conditional RBI three-working-day route", () => {
  it("H-regression: uses bankAlertAt when present", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 6, 9, 0), incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getTime()).toBe(addWorkingDays(d(2026, 1, 6, 9, 0), 3).getTime());
  });

  it("uses bankAlertAt rather than incidentAt", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 6, 9, 0), incidentAt: iso(2026, 1, 5, 10, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    // If it used incidentAt (5 Jan), +3wd would be Thu8; using bankAlertAt 6 Jan => Fri9? Let's check
    // 6 Jan Tue +3wd: Wed7=1, Thu8=2, Fri9=3 => Fri9
    expect(dl.getDate()).toBe(9);
  });

  it("does not invent an alert date from the incident time", () => {
    const c = makeCase({ bankAlertAt: undefined, incidentAt: iso(2026, 1, 5, 10, 0) });
    expect(TRACK_BY_ID.get("bank-notice")!.deadline(c)).toBeNull();
  });

  it("A: Monday alert => end of Thursday estimate", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 5, 9, 0) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getDate()).toBe(8);
    expect(dl.getHours()).toBe(23);
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

  it("G: midnight alert 00:05 still maps to the end of the estimated date", () => {
    const c = makeCase({ bankAlertAt: iso(2026, 1, 5, 0, 5) });
    const dl = TRACK_BY_ID.get("bank-notice")!.deadline(c)!;
    expect(dl.getHours()).toBe(23);
  });
});

describe("bank-credit — conditional RBI unauthorised-transaction timing", () => {
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

  it("prefers the explicit bank notification time over the UI completion timestamp", () => {
    const trackDone = iso(2026, 1, 6, 10, 0);
    const bankNotified = iso(2026, 1, 5, 10, 0);
    const c = makeCase({ bank: { name: "SBI", notifiedAt: bankNotified } as any, tracks: [{ id: "bank-notice", doneAt: trackDone }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getTime()).toBe(addWorkingDays(d(2026, 1, 5, 10, 0), 10).getTime());
  });

  it("F: 10wd from Mon 5 Jan => end of Sat 17 Jan estimate", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getDate()).toBe(17);
    expect(dl.getHours()).toBe(23);
  });

  it("E: 10wd crossing year — 29 Dec 2025 => 9 Jan 2026", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2025, 12, 29, 10, 0) }] });
    const dl = TRACK_BY_ID.get("bank-credit")!.deadline(c)!;
    expect(dl.getFullYear()).toBe(2026);
    expect(dl.getMonth()).toBe(0);
    expect(dl.getDate()).toBe(9);
  });
});

describe("Ombudsman — RB-IOS 2026 opening and filing window", () => {
  it("has no opening or deadline when the regulated entity was not complained to", () => {
    const c = makeCase();
    expect(TRACK_BY_ID.get("ombudsman")!.deadline(c)).toBeNull();
    expect(TRACK_BY_ID.get("ombudsman")!.opensAt!(c)).toBeNull();
  });

  it("opens after the ordinary 30-day response period and closes 90 days later", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 7, 5, 10, 0) }] });
    const track = TRACK_BY_ID.get("ombudsman")!;

    expect(track.opensAt!(c)).toEqual(d(2026, 8, 4, 10, 0));
    expect(track.deadline(c)).toEqual(d(2026, 11, 2, 10, 0));
  });

  it("honours a verified longer RBI, NPCI or card-network response period", () => {
    const c = makeCase({
      tracks: [{ id: "bank-notice", doneAt: iso(2026, 7, 5, 10, 0) }],
      bank: { ombudsmanResponseTimelineDays: 45 },
    });
    const track = TRACK_BY_ID.get("ombudsman")!;

    expect(track.opensAt!(c)).toEqual(d(2026, 8, 19, 10, 0));
    expect(track.deadline(c)).toEqual(d(2026, 11, 17, 10, 0));
  });

  it("opens on an earlier dissatisfied reply but keeps the ordinary outer window", () => {
    const c = makeCase({
      tracks: [{ id: "bank-notice", doneAt: iso(2026, 7, 5, 10, 0) }],
      bank: {
        dissatisfiedReplyAt: iso(2026, 7, 15, 10, 0),
        lastCommunicationAt: iso(2026, 7, 15, 10, 0),
      },
    });
    const track = TRACK_BY_ID.get("ombudsman")!;

    expect(track.opensAt!(c)).toEqual(d(2026, 7, 15, 10, 0));
    expect(track.deadline(c)).toEqual(d(2026, 11, 2, 10, 0));
  });

  it("extends the filing window from a later regulated-entity communication", () => {
    const c = makeCase({
      tracks: [{ id: "bank-notice", doneAt: iso(2026, 7, 5, 10, 0) }],
      bank: { lastCommunicationAt: iso(2026, 9, 1, 10, 0) },
    });

    expect(TRACK_BY_ID.get("ombudsman")!.deadline(c)).toEqual(d(2026, 11, 30, 10, 0));
  });

  it("carries the 2026 scheme and Clause 10 provenance", () => {
    const source = TRACK_BY_ID.get("ombudsman")!.source!;

    expect(source.effectiveOn).toBe("2026-07-01");
    expect(source.provisions).toEqual(
      expect.arrayContaining(["10(1)(f)", "10(1)(g)"]),
    );
  });

  it("is upcoming before opening, due during the window, and missed only after closing", () => {
    const c = makeCase({ tracks: [{ id: "bank-notice", doneAt: iso(2026, 7, 5, 10, 0) }] });
    const before = liveTracks(c, d(2026, 7, 20)).find((track) => track.def.id === "ombudsman")!;
    const during = liveTracks(c, d(2026, 9, 1)).find((track) => track.def.id === "ombudsman")!;
    const after = liveTracks(c, d(2026, 11, 3)).find((track) => track.def.id === "ombudsman")!;

    expect(before.state).toBe("upcoming");
    expect(before.deadline).toEqual(d(2026, 8, 4, 10, 0));
    expect(before.dateKind).toBe("opens");
    expect(during.state).toBe("due");
    expect(during.deadline).toEqual(d(2026, 11, 2, 10, 0));
    expect(during.dateKind).toBe("deadline");
    expect(after.state).toBe("missed");
  });
});

describe("bank-resolution — conditional RBI unauthorised-transaction timing", () => {
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

  it("known non-eligibility removes the conditional RBI 10- and 90-day tracks", () => {
    const input = {
      initiation: "victim",
      credentialsShared: "no",
      suspectedBankFault: "no",
      reportTiming: "within_3_working_days",
    } as const;
    const c = makeCase({
      tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 5, 10, 0) }],
      legal: {
        rbi: {
          input,
          assessment: assessRbiEligibility(input),
          assessedAt: iso(2026, 1, 5, 10, 5),
        },
      },
    });
    const live = liveTracks(c, d(2026, 1, 6, 9, 0));

    for (const id of ["bank-credit", "bank-resolution"] as const) {
      const track = live.find((item) => item.def.id === id)!;
      expect(track.state).toBe("na");
      expect(track.finalDeadline).toBeNull();
    }
  });

  it("keeps paragraph 9 and 10 process tracks for credential sharing with post-report protection", () => {
    const input = {
      initiation: "not-victim",
      credentialsShared: "yes",
      suspectedBankFault: "no",
      reportTiming: "within_3_working_days",
    } as const;
    const notifiedAt = iso(2026, 1, 5, 10, 0);
    const c = makeCase({
      bank: { notifiedAt },
      tracks: [{ id: "bank-notice", doneAt: iso(2026, 1, 6, 15, 0) }],
      legal: {
        rbi: {
          input,
          assessment: assessRbiEligibility(input),
          assessedAt: iso(2026, 1, 6, 15, 5),
        },
      },
    });
    const live = liveTracks(c, d(2026, 1, 6, 16, 0));

    expect(c.legal?.rbi?.assessment.protection).toBe("post_report_loss_only");
    for (const id of ["bank-credit", "bank-resolution"] as const) {
      const track = live.find((item) => item.def.id === id)!;
      expect(track.state).toBe("due");
      expect(track.finalDeadline).not.toBeNull();
    }
  });

  it("nextAction keeps immediate no-cutoff actions ahead by track order", () => {
    const c = makeCase({ incidentAt: iso(2026, 1, 5, 10, 0), bankAlertAt: iso(2026, 1, 5, 10, 0) });
    const next = nextAction(c, d(2026, 1, 5, 12, 0))!;

    expect(next.state).toBe("due");
    expect(next.def.id).toBe("helpline");
  });

  it("isFinancial true when triage includes bank-notice", () => {
    const c = makeCase();
    expect(isFinancial(c)).toBe(true);
  });

  it("upcomingDeadline skips done/na and returns soonest future", () => {
    const c = makeCase({
      incidentAt: iso(2026, 1, 5, 10, 0),
      bankAlertAt: iso(2026, 1, 5, 10, 0),
    });
    const now = d(2026, 1, 5, 9, 0);
    const up = upcomingDeadline(c, now);
    expect(up).not.toBeNull();
    expect(up!.def.id).toBe("bank-notice");
  });
});
