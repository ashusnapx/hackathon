import type { DictKey } from "@/lib/i18n";
import { addDays, addHours, addWorkingDays, countdown } from "./time";
import type { CaseFile, TrackId, TrackState } from "./types";

export interface TrackDef {
  id: TrackId;
  /** Roman numeral shown on the spine — these are ordered, not ranked. */
  index: number;
  titleKey: DictKey;
  whyKey: DictKey;
  howKey: DictKey;
  dueKey: DictKey;
  /** Where the citizen actually goes to do this. */
  action?: { href: string; labelKey: DictKey; tel?: boolean };
  /** Which generated document backs this track. */
  doc?: keyof CaseFile["docs"];
  /** Only financial-fraud cases get the bank and Ombudsman tracks. */
  financialOnly?: boolean;
  /**
   * Deadline, derived from the case. Returning null means "no fixed date" —
   * the track is real but not on a statutory clock.
   */
  deadline: (c: CaseFile) => Date | null;
  /** Some tracks cannot start until an earlier one is done. */
  blockedBy?: TrackId;
}

function incidentDate(c: CaseFile): Date {
  return new Date(c.incidentAt || c.triage?.incidentAt || c.createdAt);
}

/**
 * The RBI three-working-day clock runs from when the bank's alert reached the
 * customer, not from when they noticed the money was gone. Falling back to the
 * incident time is the conservative reading — it can only make the deadline
 * earlier, never later.
 */
function alertDate(c: CaseFile): Date {
  return new Date(c.bankAlertAt || c.incidentAt || c.createdAt);
}

function notifiedDate(c: CaseFile): Date | null {
  const t = c.tracks.find((t) => t.id === "bank-notice");
  if (t?.doneAt) return new Date(t.doneAt);
  if (c.bank.notifiedAt) return new Date(c.bank.notifiedAt);
  return null;
}

export const TRACKS: TrackDef[] = [
  {
    id: "helpline",
    index: 1,
    titleKey: "track.1930.t",
    whyKey: "track.1930.w",
    howKey: "track.1930.h",
    dueKey: "track.1930.d",
    action: { href: "tel:1930", labelKey: "sos.call", tel: true },
    doc: "script",
    financialOnly: true,
    deadline: (c) => addHours(incidentDate(c), 1),
  },
  {
    id: "ncrp",
    index: 2,
    titleKey: "track.ncrp.t",
    whyKey: "track.ncrp.w",
    howKey: "track.ncrp.h",
    dueKey: "track.ncrp.d",
    action: { href: "https://cybercrime.gov.in", labelKey: "track.open" },
    doc: "ncrp",
    deadline: (c) => addHours(incidentDate(c), 24),
  },
  {
    id: "bank-notice",
    index: 3,
    titleKey: "track.bank.t",
    whyKey: "track.bank.w",
    howKey: "track.bank.h",
    dueKey: "track.bank.d",
    doc: "bank",
    financialOnly: true,
    deadline: (c) => addWorkingDays(alertDate(c), 3),
  },
  {
    id: "fir",
    index: 4,
    titleKey: "track.fir.t",
    whyKey: "track.fir.w",
    howKey: "track.fir.h",
    dueKey: "track.fir.d",
    doc: "fir",
    deadline: () => null,
  },
  {
    id: "chakshu",
    index: 5,
    titleKey: "track.chakshu.t",
    whyKey: "track.chakshu.w",
    howKey: "track.chakshu.h",
    dueKey: "track.chakshu.d",
    action: { href: "https://sancharsaathi.gov.in/sfc/", labelKey: "track.open" },
    doc: "chakshu",
    deadline: () => null,
  },
  {
    id: "bank-credit",
    index: 6,
    titleKey: "track.credit.t",
    whyKey: "track.credit.w",
    howKey: "track.credit.h",
    dueKey: "track.credit.d",
    financialOnly: true,
    blockedBy: "bank-notice",
    deadline: (c) => {
      const n = notifiedDate(c);
      return n ? addWorkingDays(n, 10) : null;
    },
  },
  {
    id: "mrm",
    index: 7,
    titleKey: "track.mrm.t",
    whyKey: "track.mrm.w",
    howKey: "track.mrm.h",
    dueKey: "track.mrm.d",
    action: { href: "https://mrm-ncrp.mha.gov.in", labelKey: "track.open" },
    doc: "mrm",
    financialOnly: true,
    /**
     * You cannot raise a restoration request without the fourteen-digit NCRP
     * acknowledgement, so this stays shut until that track is done. The clock
     * that follows belongs to the bank, not the citizen — fifteen days from the
     * investigating officer's order — so there is no date to hold them to yet.
     */
    blockedBy: "ncrp",
    deadline: () => null,
  },
  {
    id: "ombudsman",
    index: 8,
    titleKey: "track.ombudsman.t",
    whyKey: "track.ombudsman.w",
    howKey: "track.ombudsman.h",
    dueKey: "track.ombudsman.d",
    action: { href: "https://cms.rbi.org.in", labelKey: "track.open" },
    doc: "ombudsman",
    financialOnly: true,
    blockedBy: "bank-notice",
    deadline: (c) => {
      const n = notifiedDate(c);
      return n ? addDays(n, 30) : null;
    },
  },
  {
    id: "bank-resolution",
    index: 9,
    titleKey: "track.resolution.t",
    whyKey: "track.resolution.w",
    howKey: "track.resolution.h",
    dueKey: "track.resolution.d",
    financialOnly: true,
    blockedBy: "bank-notice",
    deadline: (c) => {
      const n = notifiedDate(c);
      return n ? addDays(n, 90) : null;
    },
  },
  {
    id: "legal-aid",
    index: 10,
    titleKey: "track.legal.t",
    whyKey: "track.legal.w",
    howKey: "track.legal.h",
    dueKey: "track.legal.d",
    action: { href: "tel:15100", labelKey: "track.legal.call", tel: true },
    /** Not a clock — an entitlement almost nobody is told they already have. */
    deadline: () => null,
  },
];

export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));

export interface ScheduledTrack {
  id: TrackId;
  index: number;
  titleKey: DictKey;
  dueKey: DictKey;
  /** null where the track is real but not on a statutory clock. */
  deadline: Date | null;
}

/**
 * Every deadline for a hypothetical incident at `at`.
 *
 * The landing page has no case file, but it does have the same rules, and a
 * date a reader can check against their own calendar argues far better than
 * "ten working days after you notified". This runs the real deadline functions
 * — not a second copy of them — so the page cannot drift from the app.
 *
 * The rules above read six fields and no others: `incidentAt`, `bankAlertAt`,
 * `createdAt`, `triage.incidentAt`, `bank.notifiedAt` and `tracks`. A stub
 * carrying those is therefore sufficient, and a stub is the honest shape: there
 * is no case here, only an "if this happened to you now".
 *
 * `bank.notifiedAt` is the assumption worth naming. Three of the ten clocks
 * start when the citizen writes to their bank rather than when the fraud
 * happens, so passing the same instant for both means "and you notify today".
 * Callers must say so; the landing section does, in the line under the list.
 */
export function scheduleFrom(at: Date): ScheduledTrack[] {
  const iso = at.toISOString();
  const stub = {
    createdAt: iso,
    incidentAt: iso,
    bankAlertAt: iso,
    bank: { notifiedAt: iso },
    tracks: [],
  } as unknown as CaseFile;

  return TRACKS.map((t) => ({
    id: t.id,
    index: t.index,
    titleKey: t.titleKey,
    dueKey: t.dueKey,
    deadline: t.deadline(stub),
  }));
}

export interface LiveTrack {
  def: TrackDef;
  state: TrackState;
  deadline: Date | null;
  /** Negative once overdue. */
  msLeft: number | null;
}

export function isFinancial(c: CaseFile): boolean {
  const applicable = c.triage?.applicableTracks;
  if (applicable) return applicable.includes("bank-notice");
  return (c.amount ?? 0) > 0;
}

export function liveTracks(c: CaseFile, now = new Date()): LiveTrack[] {
  const financial = isFinancial(c);
  const allowed = c.triage?.applicableTracks;

  return TRACKS.map((def) => {
    const progress = c.tracks.find((t) => t.id === def.id);
    const deadline = def.deadline(c);
    const msLeft = deadline ? deadline.getTime() - now.getTime() : null;

    let state: TrackState;
    if (progress?.doneAt) {
      state = "done";
    } else if ((def.financialOnly && !financial) || (allowed && !allowed.includes(def.id))) {
      state = "na";
    } else if (def.blockedBy && !c.tracks.find((t) => t.id === def.blockedBy)?.doneAt) {
      state = "upcoming";
    } else if (msLeft !== null && msLeft < 0) {
      state = "missed";
    } else {
      state = "due";
    }

    return { def, state, deadline, msLeft };
  });
}

/**
 * The one thing to do next. Overdue-but-still-worth-doing beats not-yet-due,
 * and among equals the nearest deadline wins. A citizen under stress can hold
 * one instruction, not eight.
 */
export function nextAction(c: CaseFile, now = new Date()): LiveTrack | null {
  const live = liveTracks(c, now).filter((t) => t.state === "due" || t.state === "missed");
  if (!live.length) return null;
  return live.sort((a, b) => {
    if (a.def.index !== b.def.index && (a.state === "missed") !== (b.state === "missed")) {
      return a.state === "missed" ? -1 : 1;
    }
    if (a.msLeft === null) return 1;
    if (b.msLeft === null) return -1;
    return a.msLeft - b.msLeft;
  })[0];
}

/** The soonest future deadline, for the "nothing due right now" state. */
export function upcomingDeadline(c: CaseFile, now = new Date()): LiveTrack | null {
  return (
    liveTracks(c, now)
      .filter((t) => t.deadline && t.state !== "done" && t.state !== "na" && (t.msLeft ?? 0) > 0)
      .sort((a, b) => (a.msLeft ?? 0) - (b.msLeft ?? 0))[0] || null
  );
}

/**
 * How much of what an investigating officer will ask for is already in the file.
 * Weighted by what actually moves a case: a UTR number matters more than an
 * email address.
 */
export function completeness(c: CaseFile): { score: number; missing: DictKey[] } {
  const checks: { ok: boolean; weight: number; key: DictKey }[] = [
    { ok: !!c.rawStatement && c.rawStatement.length > 60, weight: 15, key: "start.h1" },
    { ok: !!c.triage, weight: 10, key: "triage.category" },
    { ok: !!(c.incidentAt || c.triage?.incidentAt), weight: 10, key: "triage.when" },
    { ok: !!c.victim.name, weight: 10, key: "build.you.name" },
    { ok: !!c.victim.phone, weight: 8, key: "build.you.phone" },
    { ok: !!(c.victim.state && c.victim.district), weight: 7, key: "build.you.state" },
    { ok: !isFinancial(c) || !!c.amount, weight: 10, key: "build.money.amount" },
    { ok: !isFinancial(c) || !!c.bank.name, weight: 8, key: "build.money.bank" },
    { ok: !isFinancial(c) || c.txns.some((t) => t.ref) || c.entities.refs.length > 0, weight: 12, key: "build.money.txn" },
    {
      ok:
        c.suspect.phones.length + c.suspect.upiIds.length + c.suspect.accounts.length + c.suspect.urls.length >
        0,
      weight: 10,
      key: "build.suspect.t",
    },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  return {
    score: Math.round((got / total) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
  };
}