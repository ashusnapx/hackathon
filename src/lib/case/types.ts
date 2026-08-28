import type { DictKey } from "@/lib/i18n";
import type { EvidenceItem } from "./evidence";

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
  /** When the bank's SMS reached them — the RBI three-day clock starts here. */
  bankAlertAt?: string;
  amount?: number;
  txns: Txn[];

  victim: {
    name?: string; phone?: string; email?: string;
    state?: string; district?: string; address?: string;
  };
  bank: { name?: string; last4?: string; ackRef?: string; notifiedAt?: string };
  suspect: { phones: string[]; upiIds: string[]; accounts: string[]; urls: string[]; handles: string[] };

  evidenceText: string;
  files: { name: string; size: number; type: string }[];

  tracks: TrackProgress[];
  docs: CaseDocs;
  events: CaseEvent[];
  /** Evidence Vault — checklist per case, stored locally. Optional for backwards compat. */
  evidence?: EvidenceItem[];
}
