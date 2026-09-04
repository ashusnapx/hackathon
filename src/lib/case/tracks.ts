import type { DictKey } from "@/lib/i18n";
import {
  calculateRbiOmbudsmanWindow,
  RBI_OMBUDSMAN_2026,
  type RbiOmbudsmanWindow,
} from "@/lib/legal/ombudsman";
import { RBI_2017_CIRCULAR } from "@/lib/legal/rbi";
import { addDays, addWorkingDays } from "./time";
import type { CaseFile, TrackId, TrackState } from "./types";

export interface TrackLegalSource {
  id: string;
  title: string;
  effectiveOn?: string;
  provisions?: readonly string[];
  url: string;
  faqUrl?: string;
}

export const I4C_IMMEDIATE_REPORTING = {
  id: "I4C-NCRP-IMMEDIATE-REPORTING",
  title: "National Cyber Crime Reporting Portal: immediate reporting via 1930",
  url: "https://www.cybercrime.gov.in/Accept.aspx",
} as const;

export const BNSS_COGNIZABLE_REPORTING = {
  id: "BNSS-2023-S173",
  title: "Bharatiya Nagarik Suraksha Sanhita, 2023",
  effectiveOn: "2024-07-01",
  provisions: ["173"],
  url: "https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf",
} as const;

export const DOT_CHAKSHU = {
  id: "DOT-SANCHAR-SAATHI-CHAKSHU",
  title: "Department of Telecommunications: Sanchar Saathi / Chakshu",
  url: "https://eservices.dot.gov.in/",
} as const;

export const MHA_MONEY_RESTORATION = {
  id: "MHA-I4C-MONEY-RESTORATION",
  title: "Ministry of Home Affairs: Money Restoration Portal",
  url: "https://mrm-ncrp.mha.gov.in/restoration/",
} as const;

export const NALSA_LEGAL_AID = {
  id: "NALSA-LEGAL-AID",
  title: "National Legal Services Authority: Legal Aid",
  url: "https://nalsa.gov.in/legal-aid/",
  faqUrl: "https://nalsa.gov.in/promoting-inclusive-legal-system/",
} as const;

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
  /** Urgent product action with no invented statutory expiry. */
  immediate?: boolean;
  /** This clock exists only inside the RBI unauthorised-transaction framework. */
  requiresRbiUnauthorisedTransaction?: boolean;
  /** Prototype estimate skips standard weekends but has no branch holiday feed. */
  workingDayEstimate?: boolean;
  /** Official source underlying the rule or timing guidance. */
  source?: TrackLegalSource;
  /** Date on which an action window opens, when it is not immediately available. */
  opensAt?: (c: CaseFile) => Date | null;
  /**
   * Deadline, derived from the case. Returning null means "no fixed date" —
   * the track is real but not on a statutory clock.
   */
  deadline: (c: CaseFile) => Date | null;
  /** Some tracks cannot start until an earlier one is done. */
  blockedBy?: TrackId;
}

/**
 * The RBI three-working-day rule runs from when the bank's transaction
 * communication reached the customer—not from the incident. Without that fact
 * we refuse to display a precise date rather than substitute a plausible one.
 */
function alertDate(c: CaseFile): Date | null {
  if (!c.bankAlertAt) return null;
  const value = new Date(c.bankAlertAt);
  return Number.isNaN(value.getTime()) ? null : value;
}

function notifiedDate(c: CaseFile): Date | null {
  // The explicit grievance timestamp is the legal trigger. `doneAt` is only a
  // legacy fallback for cases created before the UI captured the real notice
  // time separately from the moment its checkbox was clicked.
  if (c.bank.notifiedAt) return new Date(c.bank.notifiedAt);
  const t = c.tracks.find((t) => t.id === "bank-notice");
  if (t?.doneAt) return new Date(t.doneAt);
  return null;
}

function validOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function ombudsmanWindow(c: CaseFile): RbiOmbudsmanWindow | null {
  const complaintAt = notifiedDate(c);
  if (!complaintAt || Number.isNaN(complaintAt.getTime())) return null;
  const suppliedDays = c.bank.ombudsmanResponseTimelineDays;
  const applicableResponseDays =
    suppliedDays !== undefined && Number.isFinite(suppliedDays) && suppliedDays >= 0
      ? suppliedDays
      : undefined;

  return calculateRbiOmbudsmanWindow({
    regulatedEntityComplaintAt: complaintAt,
    applicableResponseDays,
    dissatisfiedReplyAt: validOptionalDate(c.bank.dissatisfiedReplyAt),
    lastCommunicationAt: validOptionalDate(c.bank.lastCommunicationAt),
  });
}

function rbiUnauthorisedTimingMayApply(c: CaseFile): boolean {
  // A `not_eligible` status can still represent paragraph 7(i): where a
  // credential was shared, pre-report loss may sit with the customer but the
  // circular's post-report and paragraph 9/10 process still matters. Only a
  // payment the citizen says they initiated/approved is outside this circular.
  return c.legal?.rbi?.assessment.protection !== "not_applicable";
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
    immediate: true,
    source: I4C_IMMEDIATE_REPORTING,
    // I4C says to report immediately, but publishes no nationwide one-hour
    // limitation period. Urgency is product guidance, not a legal cutoff.
    deadline: () => null,
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
    immediate: true,
    source: I4C_IMMEDIATE_REPORTING,
    // No nationwide 24-hour filing deadline is published for NCRP complaints.
    deadline: () => null,
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
    workingDayEstimate: true,
    source: {
      ...RBI_2017_CIRCULAR,
      provisions: ["6", "7"],
    },
    deadline: (c) => {
      if (c.legal?.rbi?.assessment.status === "not_eligible") return null;
      const alert = alertDate(c);
      return alert ? addWorkingDays(alert, 3) : null;
    },
  },
  {
    id: "fir",
    index: 4,
    titleKey: "track.fir.t",
    whyKey: "track.fir.w",
    howKey: "track.fir.h",
    dueKey: "track.fir.d",
    doc: "fir",
    source: BNSS_COGNIZABLE_REPORTING,
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
    source: DOT_CHAKSHU,
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
    requiresRbiUnauthorisedTransaction: true,
    workingDayEstimate: true,
    source: {
      ...RBI_2017_CIRCULAR,
      provisions: ["9"],
    },
    blockedBy: "bank-notice",
    deadline: (c) => {
      if (!rbiUnauthorisedTimingMayApply(c)) return null;
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
    source: MHA_MONEY_RESTORATION,
    // Keep this behind the NCRP step, but the copy still requires separate
    // confirmation that funds are actually held. An acknowledgement alone is
    // never represented as a hold, recoverable balance or refund.
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
    source: RBI_OMBUDSMAN_2026,
    blockedBy: "bank-notice",
    opensAt: (c) => ombudsmanWindow(c)?.eligibleFrom ?? null,
    deadline: (c) => ombudsmanWindow(c)?.fileBy ?? null,
  },
  {
    id: "bank-resolution",
    index: 9,
    titleKey: "track.resolution.t",
    whyKey: "track.resolution.w",
    howKey: "track.resolution.h",
    dueKey: "track.resolution.d",
    financialOnly: true,
    requiresRbiUnauthorisedTransaction: true,
    source: {
      ...RBI_2017_CIRCULAR,
      provisions: ["10"],
    },
    blockedBy: "bank-notice",
    deadline: (c) => {
      if (!rbiUnauthorisedTimingMayApply(c)) return null;
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
    source: NALSA_LEGAL_AID,
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
  /** Whether the displayed edge opens a route or closes a filing window. */
  dateKind: "opens" | "deadline" | null;
}

/**
 * Every deadline for a hypothetical incident at `at`.
 *
 * The landing page has no case file, but it does have the same rules, and a
 * date a reader can check against their own calendar argues far better than
 * "ten working days after you notified". This runs the real deadline functions
 * — not a second copy of them — so the page cannot drift from the app.
 *
 * A stub is the honest shape here: there is no case or answer-backed legal
 * assessment, only an "if this happened to you now" example. Unknown RBI
 * eligibility therefore stays conditional, and the Ombudsman example uses its
 * ordinary 30-day response period because no longer product-specific period or
 * later communication is supplied.
 *
 * `bank.notifiedAt` is the assumption worth naming. Several conditional dates
 * use bank notification or response facts rather than the incident time, so
 * passing the same instant here means "and you notify today".
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

  return TRACKS.map((t) => {
    // A dated public example should show when a future action first becomes
    // available. The live case switches to its final filing deadline once open.
    const opensAt = t.opensAt?.(stub) ?? null;
    const finalDeadline = t.deadline(stub);
    return {
      id: t.id,
      index: t.index,
      titleKey: t.titleKey,
      dueKey: t.dueKey,
      deadline: opensAt ?? finalDeadline,
      dateKind: opensAt ? "opens" as const : finalDeadline ? "deadline" as const : null,
    };
  });
}

export interface LiveTrack {
  def: TrackDef;
  state: TrackState;
  /** Next relevant edge: opening date before a window opens, final date after. */
  deadline: Date | null;
  opensAt: Date | null;
  finalDeadline: Date | null;
  /** Meaning of `deadline`, which may actually be the date a route opens. */
  dateKind: "opens" | "deadline" | null;
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
    const opensAt = def.opensAt?.(c) ?? null;
    const finalDeadline = def.deadline(c);
    const waitingToOpen = Boolean(opensAt && opensAt.getTime() > now.getTime());
    const deadline = waitingToOpen ? opensAt : finalDeadline;
    const dateKind = waitingToOpen ? "opens" : finalDeadline ? "deadline" : null;
    const msLeft = deadline ? deadline.getTime() - now.getTime() : null;

    let state: TrackState;
    if (progress?.doneAt) {
      state = "done";
    } else if ((def.financialOnly && !financial) || (allowed && !allowed.includes(def.id))) {
      state = "na";
    } else if (
      def.requiresRbiUnauthorisedTransaction &&
      !rbiUnauthorisedTimingMayApply(c)
    ) {
      state = "na";
    } else if (def.blockedBy && !c.tracks.find((t) => t.id === def.blockedBy)?.doneAt) {
      state = "upcoming";
    } else if (waitingToOpen) {
      state = "upcoming";
    } else if (finalDeadline && finalDeadline.getTime() < now.getTime()) {
      state = "missed";
    } else {
      state = "due";
    }

    return { def, state, deadline, opensAt, finalDeadline, dateKind, msLeft };
  });
}

/**
 * The one thing to do next. Immediate reporting actions retain their product
 * priority without being given fake deadlines. After those, overdue-but-still-
 * worth-doing beats not-yet-due, and among equals the nearest deadline wins.
 * A citizen under stress can hold one instruction, not ten.
 */
export function nextAction(c: CaseFile, now = new Date()): LiveTrack | null {
  const live = liveTracks(c, now).filter((t) => t.state === "due" || t.state === "missed");
  if (!live.length) return null;
  return live.sort((a, b) => {
    if (a.def.immediate !== b.def.immediate) return a.def.immediate ? -1 : 1;
    if (a.def.immediate && b.def.immediate) return a.def.index - b.def.index;
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
