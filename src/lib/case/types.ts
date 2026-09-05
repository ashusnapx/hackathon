import type { EvidenceItem } from "./evidence";
import type { RbiEligibilityAssessment, RbiEligibilityInput } from "@/lib/legal/rbi";

export type TrackId =
  | "helpline"
  | "ncrp"
  | "bank-notice"
  | "bank-credit"
  | "mrm"
  | "fir"
  | "chakshu"
  | "ombudsman"
  | "bank-resolution"
  | "legal-aid";

export type TrackState = "due" | "upcoming" | "done" | "missed" | "na";

export interface TrackProgress {
  id: TrackId;
  doneAt?: string;
  /** Free-text the citizen adds, e.g. a bank acknowledgement number. */
  note?: string;
  ref?: string;
}

export interface Txn {
  amount?: number;
  ref?: string;
  bank?: string;
  at?: string;
}

export interface Entities {
  upiIds: string[];
  phones: string[];
  accounts: string[];
  refs: string[];
  urls: string[];
  emails: string[];
  handles: string[];
  apps: string[];
}

export const EMPTY_ENTITIES: Entities = {
  upiIds: [], phones: [], accounts: [], refs: [], urls: [], emails: [], handles: [], apps: [],
};

export interface Triage {
  categoryId: string;
  subcategoryId?: string;
  /** 0–1, from the model. Low confidence gets surfaced, not hidden. */
  confidence: number;
  amount?: number;
  /** ISO. When the fraud happened, as best we can tell. */
  incidentAt?: string;
  /** One-line reason, in English, for why this category was chosen. */
  rationale?: string;
  /** The citizen's account, rewritten as formal English for the authorities. */
  englishNarrative?: string;
  /** Which of the eight tracks actually apply to this kind of fraud. */
  applicableTracks: TrackId[];
  urgency: "critical" | "high" | "moderate";
}

export interface CaseDocs {
  ncrp?: string;
  script?: string;
  bank?: string;
  fir?: string;
  chakshu?: string;
  mrm?: string;
  ombudsman?: string;
  /** Same documents rendered in the citizen's language, so they can read what they sign. */
  translated?: Partial<Record<"ncrp" | "script" | "bank" | "fir" | "chakshu" | "mrm" | "ombudsman", string>>;
  /** Language shared by the cached translations; absent legacy values are not displayed. */
  translatedLanguage?: string;
  generatedAt?: string;
  generatedBy?: "openai" | "rules";
}

export interface CaseEvent {
  at: string;
  kind: "opened" | "triaged" | "track" | "docs" | "edit";
  label: string;
}

export interface CaseFile {
  id: string;
  ref: string;
  createdAt: string;
  language: string;

  /** Exactly what the citizen said, in their own language. Never overwritten. */
  rawStatement: string;
  triage: Triage | null;
  entities: Entities;

  incidentAt?: string;
  /** Coarse answer retained when no exact incident timestamp is confirmed. */
  incidentTimingRange?: "last-hour" | "today" | "older" | "unsure";
  /** When the bank's transaction communication reached them; relevant to the conditional RBI three-working-day route. */
  bankAlertAt?: string;
  amount?: number;
  txns: Txn[];

  victim: {
    name?: string; phone?: string; email?: string;
    state?: string; district?: string; address?: string;
    /** Named on an FIR application, where a district alone will not do. */
    policeStation?: string;
    ageContext?: "adult-or-no-child" | "self-minor" | "child-other" | "unknown";
  };
  bank: {
    name?: string;
    /** The branch the dispute letter is addressed to. */
    branchAddress?: string;
    last4?: string;
    ackRef?: string;
    notifiedAt?: string;
    /** Verified longer RBI/NPCI/card-network response period, if one applies. */
    ombudsmanResponseTimelineDays?: number;
    /** Actual reply that the citizen considers unsatisfactory. */
    dissatisfiedReplyAt?: string;
    /** Latest communication from the bank about this grievance. */
    lastCommunicationAt?: string;
  };
  suspect: { phones: string[]; upiIds: string[]; accounts: string[]; urls: string[]; handles: string[] };

  evidenceText: string;
  files: { name: string; size: number; type: string }[];

  tracks: TrackProgress[];
  docs: CaseDocs;
  events: CaseEvent[];
  /** Answer-backed legal screens. These are guidance, never findings of fact. */
  legal?: {
    rbi?: {
      input: RbiEligibilityInput;
      assessment: RbiEligibilityAssessment;
      assessedAt: string;
    };
  };
  /** Evidence Vault — checklist per case, stored locally. Optional for backwards compat. */
  evidence?: EvidenceItem[];
  /**
   * The voice call this case was opened from.
   *
   * A real call is held as a server-issued capability and never as a provider
   * call id: it is what lets the Call tab fetch this case's own recording and
   * transcript, and it is scoped to the browser session that made the call. A
   * second case gets its own token, so one case can never show another case's
   * conversation. The sample case is the exception, and says so — it names the
   * one call committed to this repository, which anyone may listen to.
   */
  voiceCall?: {
    /** Capability for a real call, scoped to the browser session that made it. */
    transcriptToken?: string;
    /** Set instead on the sample case, which reads the call committed to the repo. */
    demoCallId?: string;
    endedAt: string;
  };
}
