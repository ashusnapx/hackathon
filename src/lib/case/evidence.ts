"use client";

import type { CaseFile } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────
export type EvidenceCategory = "transaction" | "communication" | "complaint";
export type EvidenceStatus = "missing" | "added" | "not_applicable";

export interface EvidenceAttachment {
  name: string;
  size: number;
  type: string;
  addedAt: string;
  /** Key for the actual Blob in IndexedDB. Absent on legacy metadata-only records. */
  storageKey?: string;
  /** SHA-256 fingerprint of the exact stored bytes; useful for later integrity checks. */
  sha256?: string;
  /** True only after the IndexedDB transaction has completed successfully. */
  storedLocally?: boolean;
}

export interface EvidenceItem {
  id: string;
  category: EvidenceCategory;
  /** machine key, stable across cases */
  typeKey: string;
  title: string;
  description: string;
  why: string;
  status: EvidenceStatus;
  createdAt: string;
  updatedAt: string;
  attachment?: EvidenceAttachment;
}

// ── Constants ─────────────────────────────────────────────────────────────
export const ALLOWED_EVIDENCE_TYPES = ["image/png", "image/jpeg", "application/pdf"] as const;
export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTS = [".png", ".jpg", ".jpeg", ".pdf"];

export type EvidenceAttachmentBlockReason =
  | "child-sexual-content-risk"
  | "intimate-content-risk";

/**
 * Local attachments are deliberately unavailable where an upload could create
 * another copy of child sexual-abuse or non-consensual intimate material.
 * Citizens can still record that evidence is held on the source device and
 * preserve a URL/account identifier for an authorised investigator.
 */
export function evidenceAttachmentBlockReason(
  c: CaseFile,
): EvidenceAttachmentBlockReason | null {
  const ageContext = c.victim?.ageContext;
  const subcategory = c.triage?.subcategoryId;

  if (
    ageContext === "self-minor" ||
    ageContext === "child-other" ||
    subcategory === "csam"
  ) {
    return "child-sexual-content-risk";
  }

  if (subcategory === "sextortion" || subcategory === "morphed") {
    return "intimate-content-risk";
  }

  return null;
}

export type EvidenceFileError = "ev-file-type" | "ev-file-size" | "ev-file-empty";

export function validateEvidenceFile(file: { name: string; type: string; size: number }): EvidenceFileError | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const typeOk = (ALLOWED_EVIDENCE_TYPES as readonly string[]).includes(file.type) || ALLOWED_EXTS.includes(ext);
  if (!typeOk) return "ev-file-type";
  if (file.size > MAX_EVIDENCE_FILE_SIZE) return "ev-file-size";
  if (file.size === 0) return "ev-file-empty";
  return null;
}

// ── Checklist templates ───────────────────────────────────────────────────
// Citizen-friendly copy. Keep short, no jargon.
export interface EvidenceTemplate {
  id: string;
  category: EvidenceCategory;
  typeKey: string;
  title: string;
  description: string;
  why: string;
}

export const EVIDENCE_TEMPLATES: EvidenceTemplate[] = [
  // Transaction evidence (4)
  {
    id: "txn_screenshot",
    category: "transaction",
    typeKey: "txn_screenshot",
    title: "Transaction screenshot",
    description: "Screenshot of the debit from your bank app or UPI app.",
    why: "Helps record the displayed amount, time and transaction reference; keep the underlying bank record too.",
  },
  {
    id: "bank_statement",
    category: "transaction",
    typeKey: "bank_statement",
    title: "Bank statement",
    description: "PDF or screenshot showing the disputed transaction line.",
    why: "Records how the debit appears on the account statement and can support a bank dispute.",
  },
  {
    id: "utr_reference",
    category: "transaction",
    typeKey: "utr_reference",
    title: "UTR / transaction reference",
    description: "12-digit UTR, RRN or UPI reference number.",
    why: "Helps the relevant payment participants identify and trace the same transaction.",
  },
  {
    id: "sms_notification",
    category: "transaction",
    typeKey: "sms_notification",
    title: "SMS / transaction notification",
    description: "Screenshot of the SMS or notification your bank sent.",
    why: "Helps establish when you received the bank's communication, which can matter in the RBI's conditional liability analysis.",
  },
  // Communication evidence (5)
  {
    id: "chat_screenshot",
    category: "communication",
    typeKey: "chat_screenshot",
    title: "WhatsApp / chat screenshots",
    description: "Screenshots of chats with the fraudster.",
    why: "Preserves the displayed promises, impersonation or instructions; a screenshot alone does not prove who controlled the account.",
  },
  {
    id: "email_correspondence",
    category: "communication",
    typeKey: "email_correspondence",
    title: "Email correspondence",
    description: "Any emails or letters from the fraudster.",
    why: "Preserves the message content and, where available, technical headers that an investigator may examine.",
  },
  {
    id: "phone_number",
    category: "communication",
    typeKey: "phone_number",
    title: "Fraudster phone number",
    description: "Phone number that called or messaged you.",
    why: "Can be included accurately in a suspect report or Chakshu lead; the displayed number is not proof of the caller's identity.",
  },
  {
    id: "upi_id",
    category: "communication",
    typeKey: "upi_id",
    title: "UPI ID / payment identifier",
    description: "UPI ID, QR code or payment link you were asked to pay.",
    why: "Records the payment destination and may help authorised institutions trace the transfer; it does not prove account ownership.",
  },
  {
    id: "website_url",
    category: "communication",
    typeKey: "website_url",
    title: "Website / app URL",
    description: "Link to fake website or app you visited.",
    why: "Preserves the exact location for a report. A platform or authorised agency decides whether any restriction or takedown is appropriate.",
  },
  // Complaint & escalation evidence (3)
  {
    id: "bank_ack",
    category: "complaint",
    typeKey: "bank_ack",
    title: "Bank complaint acknowledgement",
    description: "Stamped or emailed acknowledgement from your bank.",
    why: "Proves when and how you notified the bank; timing is relevant to liability and later grievance escalation.",
  },
  {
    id: "ncrp_ack",
    category: "complaint",
    typeKey: "ncrp_ack",
    title: "NCRP complaint acknowledgement",
    description: "14-digit NCRP acknowledgement number.",
    why: "Lets you track the portal complaint and helps police or the helpline connect follow-up to the same report.",
  },
  {
    id: "fir_ack",
    category: "complaint",
    typeKey: "fir_ack",
    title: "FIR / police acknowledgement",
    description: "FIR copy or Zero-FIR acknowledgement, if obtained.",
    why: "Records the police process separately from the NCRP portal complaint and may support later police, bank or court follow-up.",
  },
];

// Weight per item — higher = more important for readiness.
// Financial fraud prioritizes transaction & acknowledgement; non-financial prioritizes communication.
const WEIGHT_FINANCIAL: Record<string, number> = {
  txn_screenshot: 10,
  bank_statement: 9,
  utr_reference: 9,
  sms_notification: 8,
  chat_screenshot: 6,
  email_correspondence: 4,
  phone_number: 7,
  upi_id: 7,
  website_url: 4,
  bank_ack: 9,
  ncrp_ack: 10,
  fir_ack: 6,
};

const WEIGHT_NON_FINANCIAL: Record<string, number> = {
  txn_screenshot: 2,
  bank_statement: 1,
  utr_reference: 1,
  sms_notification: 1,
  chat_screenshot: 10,
  email_correspondence: 8,
  phone_number: 9,
  upi_id: 3,
  website_url: 9,
  bank_ack: 1,
  ncrp_ack: 6,
  fir_ack: 8,
};

function isFinancialCase(c: CaseFile): boolean {
  const applicable = c.triage?.applicableTracks;
  if (applicable) return applicable.includes("bank-notice");
  return (c.amount ?? 0) > 0;
}

function weightFor(c: CaseFile, typeKey: string): number {
  const map = isFinancialCase(c) ? WEIGHT_FINANCIAL : WEIGHT_NON_FINANCIAL;
  return map[typeKey] ?? 5;
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function createDefaultEvidence(nowIso?: string): EvidenceItem[] {
  const now = nowIso || new Date().toISOString();
  return EVIDENCE_TEMPLATES.map((t) => ({
    id: t.id,
    category: t.category,
    typeKey: t.typeKey,
    title: t.title,
    description: t.description,
    why: t.why,
    status: "missing" as EvidenceStatus,
    createdAt: now,
    updatedAt: now,
  }));
}

/** Ensure case has evidence array — migrates old cases without breaking. */
/**
 * Timestamps here are taken from the case, never from the clock.
 *
 * This runs on every read of a stored case, and the writer decides whether a
 * case is safe to save by comparing what it loaded against what is in storage
 * now. A `new Date()` in this function makes those two strings differ every
 * time, so a case that predates the vault — or any template added later —
 * would report a phantom "changed in another tab" on every edit and could never
 * be saved again.
 */
export function ensureEvidence(c: CaseFile): CaseFile {
  const stamp = c.createdAt || new Date(0).toISOString();
  if (c.evidence && Array.isArray(c.evidence) && c.evidence.length > 0) {
    // Backfill any new templates introduced later (extensibility)
    const existingIds = new Set(c.evidence.map((e) => e.id));
    const missing = EVIDENCE_TEMPLATES.filter((t) => !existingIds.has(t.id)).map((t) => ({
      id: t.id,
      category: t.category,
      typeKey: t.typeKey,
      title: t.title,
      description: t.description,
      why: t.why,
      status: "missing" as EvidenceStatus,
      createdAt: stamp,
      updatedAt: stamp,
    }));
    if (missing.length) return { ...c, evidence: [...c.evidence, ...missing] };
    return c;
  }
  return { ...c, evidence: createDefaultEvidence(stamp) };
}

export function getEvidence(c: CaseFile): EvidenceItem[] {
  if (!c.evidence || c.evidence.length === 0) return createDefaultEvidence();
  // Also backfill templates if some missing
  const existingIds = new Set(c.evidence.map((e) => e.id));
  const missing = EVIDENCE_TEMPLATES.filter((t) => !existingIds.has(t.id));
  if (!missing.length) return c.evidence;
  const now = new Date().toISOString();
  return [
    ...c.evidence,
    ...missing.map((t) => ({
      id: t.id,
      category: t.category,
      typeKey: t.typeKey,
      title: t.title,
      description: t.description,
      why: t.why,
      status: "missing" as EvidenceStatus,
      createdAt: now,
      updatedAt: now,
    })),
  ];
}

export function setEvidenceStatus(
  c: CaseFile,
  evidenceId: string,
  status: EvidenceStatus,
): CaseFile {
  const evidence = getEvidence(c).map((e) =>
    e.id === evidenceId ? { ...e, status, updatedAt: new Date().toISOString() } : e,
  );
  return { ...c, evidence };
}

export function attachEvidenceFile(
  c: CaseFile,
  evidenceId: string,
  file: {
    name: string;
    size: number;
    type: string;
    storageKey?: string;
    sha256?: string;
    storedLocally?: boolean;
    storedAt?: string;
  },
): CaseFile {
  const err = validateEvidenceFile(file);
  if (err) throw new Error(err);
  const now = new Date().toISOString();
  const evidence = getEvidence(c).map((e) =>
    e.id === evidenceId
      ? {
          ...e,
          status: "added" as EvidenceStatus,
          updatedAt: now,
          attachment: {
            name: file.name,
            size: file.size,
            type: file.type,
            addedAt: file.storedAt ?? now,
            storageKey: file.storageKey,
            sha256: file.sha256,
            storedLocally: file.storedLocally,
          },
        }
      : e,
  );
  return { ...c, evidence };
}

export function removeEvidenceAttachment(c: CaseFile, evidenceId: string): CaseFile {
  const now = new Date().toISOString();
  const evidence = getEvidence(c).map((e) =>
    e.id === evidenceId
      ? { ...e, attachment: undefined, updatedAt: now }
      : e,
  );
  return { ...c, evidence };
}

// ── Readiness ─────────────────────────────────────────────────────────────
export type ReadinessLevel = "NOT_READY" | "PARTIALLY_READY" | "READY";

export interface EvidenceReadiness {
  /** Weighted completion of applicable checklist items, not legal sufficiency. */
  percentage: number; // 0-100
  level: ReadinessLevel;
  counts: {
    added: number;
    missing: number;
    notApplicable: number;
    total: number;
    totalApplicable: number;
    storedLocally: number;
    heldElsewhere: number;
  };
  recommendations: EvidenceItem[]; // top 3 missing, sorted by weight desc
  addedWeight: number;
  totalWeight: number;
}

export function calculateReadiness(c: CaseFile): EvidenceReadiness {
  const evidence = getEvidence(c);
  let addedWeight = 0;
  let totalWeight = 0;
  let added = 0;
  let missing = 0;
  let notApplicable = 0;
  let storedLocally = 0;
  let heldElsewhere = 0;

  for (const e of evidence) {
    if (e.status === "not_applicable") {
      notApplicable += 1;
      continue;
    }
    const w = weightFor(c, e.typeKey);
    totalWeight += w;
    if (e.status === "added") {
      added += 1;
      addedWeight += w;
      if (e.attachment?.storedLocally && e.attachment.storageKey) storedLocally += 1;
      else heldElsewhere += 1;
    } else {
      missing += 1;
    }
  }

  const percentage = totalWeight === 0 ? 0 : Math.round((addedWeight / totalWeight) * 100);
  let level: ReadinessLevel = "NOT_READY";
  if (percentage >= 80) level = "READY";
  else if (percentage >= 40) level = "PARTIALLY_READY";

  // Top 3 missing by weight
  const missingItems = evidence.filter((e) => e.status === "missing");
  missingItems.sort((a, b) => weightFor(c, b.typeKey) - weightFor(c, a.typeKey));
  const recommendations = missingItems.slice(0, 3);

  return {
    percentage,
    level,
    counts: {
      added,
      missing,
      notApplicable,
      total: evidence.length,
      totalApplicable: evidence.length - notApplicable,
      storedLocally,
      heldElsewhere,
    },
    recommendations,
    addedWeight,
    totalWeight,
  };
}

// ── Summary data (deterministic, no AI) ─────────────────────────────────
export interface EvidenceSummaryData {
  caseRef: string;
  incidentAt?: string;
  categoryLabel?: string;
  amount?: number;
  utr?: string;
  transactionAt?: string;
  paymentMethod?: string;
  evidenceCollected: Array<{
    category: EvidenceCategory;
    title: string;
    status: EvidenceStatus;
    fileName?: string;
    sha256?: string;
    storedLocally?: boolean;
  }>;
  missing: EvidenceItem[];
  notApplicable: EvidenceItem[];
  events: CaseFile["events"];
}

export function buildEvidenceSummaryData(c: CaseFile): EvidenceSummaryData {
  const evidence = getEvidence(c);
  return {
    caseRef: c.ref,
    incidentAt: c.incidentAt || c.triage?.incidentAt,
    categoryLabel: c.triage?.categoryId,
    amount: c.amount,
    utr: c.entities.refs[0] || c.txns[0]?.ref,
    transactionAt: c.txns[0]?.at || c.incidentAt,
    paymentMethod: c.bank.name || c.txns[0]?.bank,
    evidenceCollected: evidence.map((e) => ({
      category: e.category,
      title: e.title,
      status: e.status,
      fileName: e.attachment?.name,
      sha256: e.attachment?.sha256,
      storedLocally: e.attachment?.storedLocally,
    })),
    missing: evidence.filter((e) => e.status === "missing"),
    notApplicable: evidence.filter((e) => e.status === "not_applicable"),
    events: c.events,
  };
}

// ── PDF generation (reuses jsPDF pattern from pack.ts) ───────────────────
import { jsPDF } from "jspdf";
import { findCategory, findSubcategory } from "./categories";

const PAGE = { w: 210, h: 297, m: 18 };
const LINE = 4.6;

class Sheet {
  private doc: jsPDF;
  private y = PAGE.m;
  private page = 1;
  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
  }
  private ensure(space: number) {
    if (this.y + space > PAGE.h - PAGE.m - 10) {
      this.footer();
      this.doc.addPage();
      this.page += 1;
      this.y = PAGE.m;
    }
  }
  private footer() {
    this.doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(140);
    this.doc.text(
      "Prepared with Kavach — an independent tool, not a government service. Reference numbers are not official.",
      PAGE.m,
      PAGE.h - 10,
    );
    this.doc.text(String(this.page), PAGE.w - PAGE.m, PAGE.h - 10, { align: "right" });
    this.doc.setTextColor(0);
  }
  rule() {
    this.ensure(4);
    this.doc.setDrawColor(200).setLineWidth(0.2);
    this.doc.line(PAGE.m, this.y, PAGE.w - PAGE.m, this.y);
    this.y += 5;
  }
  label(text: string) {
    this.ensure(6);
    this.doc.setFont("courier", "normal").setFontSize(7.5).setTextColor(120);
    this.doc.text(text.toUpperCase(), PAGE.m, this.y);
    this.doc.setTextColor(0);
    this.y += 5;
  }
  heading(text: string, size = 15) {
    this.ensure(size * 0.6);
    this.doc.setFont("times", "normal").setFontSize(size);
    this.doc.text(text, PAGE.m, this.y);
    this.y += size * 0.55;
  }
  body(text: string, opts: { mono?: boolean; size?: number } = {}) {
    const size = opts.size ?? 9.5;
    this.doc.setFont(opts.mono ? "courier" : "helvetica", "normal").setFontSize(size);
    const lines = this.doc.splitTextToSize(text, PAGE.w - PAGE.m * 2) as string[];
    for (const line of lines) {
      this.ensure(LINE);
      this.doc.text(line, PAGE.m, this.y);
      this.y += LINE;
    }
  }
  kv(rows: [string, string][]) {
    this.doc.setFontSize(9.5);
    for (const [k, v] of rows) {
      this.ensure(LINE + 1);
      this.doc.setFont("helvetica", "normal").setTextColor(110);
      this.doc.text(k, PAGE.m, this.y);
      this.doc.setTextColor(0);
      const lines = this.doc.splitTextToSize(v || "—", PAGE.w - PAGE.m * 2 - 45) as string[];
      lines.forEach((line, i) => {
        if (i) this.ensure(LINE);
        this.doc.text(line, PAGE.m + 45, this.y);
        if (i < lines.length - 1) this.y += LINE;
      });
      this.y += LINE + 1.2;
    }
  }
  gap(mm = 6) {
    this.y += mm;
  }
  break() {
    this.footer();
    this.doc.addPage();
    this.page += 1;
    this.y = PAGE.m;
  }
  save(name: string) {
    this.footer();
    this.doc.save(name);
  }
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function downloadEvidenceSummary(c: CaseFile) {
  const s = new Sheet();
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);
  const evidence = getEvidence(c);
  const readiness = calculateReadiness(c);

  // Cover
  s.label("Kavach Case Evidence Summary");
  s.heading(c.ref, 26);
  s.gap(2);
  s.body(
    "This is a user-generated organizational summary. It does not itself constitute an official police or bank complaint. Verify all details before submitting.",
    { size: 8.5 },
  );
  s.gap(6);
  s.rule();

  // 1. Case information
  s.label("1. Case information");
  s.kv([
    ["Case reference", c.ref],
    ["Incident", fmt(c.incidentAt || c.triage?.incidentAt)],
    ["Reported", fmt(c.createdAt)],
    ["Category", cat?.label ?? c.triage?.categoryId ?? "—"],
    ["Type", sub?.label ?? c.triage?.subcategoryId ?? "—"],
  ]);

  // 2. Transaction information
  s.gap(4);
  s.label("2. Transaction information");
  s.kv([
    ["Amount", c.amount ? `Rs. ${c.amount.toLocaleString("en-IN")}` : "—"],
    ["UTR / reference", c.entities.refs.join(", ") || c.txns[0]?.ref || "—"],
    ["Transaction time", fmt(c.txns[0]?.at || c.incidentAt)],
    ["Payment method", c.bank.name || c.txns[0]?.bank || "—"],
  ]);

  // 3. User-maintained evidence checklist
  s.gap(4);
  s.label(`3. Evidence checklist — ${readiness.percentage}% of weighted applicable items marked held`);
  for (const e of evidence) {
    s.body(
      `${e.status === "added" ? "[MARKED HELD]" : e.status === "not_applicable" ? "[N/A]" : "[MISSING]"}  ${e.category.toUpperCase()} — ${e.title}${e.attachment ? ` — ${e.attachment.name}` : ""}`,
      { mono: true, size: 8 },
    );
    s.body(
      e.status === "added"
        ? e.attachment?.storedLocally
          ? `User marked held; local browser file: ${e.attachment.name} (${(e.attachment.size / 1024).toFixed(0)} KB)`
          : "User marked held elsewhere; Kavach has no verified local file bytes."
        : `Status: ${e.status}`,
      { size: 7.5 },
    );
    if (e.attachment?.sha256) {
      s.body(`SHA-256: ${e.attachment.sha256}`, { mono: true, size: 6.5 });
    }
    s.gap(2);
  }

  // 4. Missing evidence
  s.gap(2);
  s.label("4. Missing evidence");
  const missing = evidence.filter((e) => e.status === "missing");
  if (missing.length) {
    missing.forEach((e, i) => s.body(`${i + 1}. ${e.title} — ${e.description}`, { mono: true, size: 8 }));
  } else {
    s.body("No applicable item is currently marked missing. This does not establish possession, authenticity, admissibility or legal sufficiency.", { size: 8.5 });
  }

  // 5. Not applicable
  s.gap(4);
  s.label("5. Not applicable");
  const na = evidence.filter((e) => e.status === "not_applicable");
  if (na.length) na.forEach((e, i) => s.body(`${i + 1}. ${e.title}`, { mono: true, size: 8 }));
  else s.body("None marked not applicable.", { size: 8.5 });

  // 6. Timeline
  s.gap(4);
  s.label("6. Case timeline / events");
  if (c.events.length) {
    for (const ev of c.events) s.body(`${fmt(ev.at)} — ${ev.label}`, { mono: true, size: 7.5 });
  } else s.body("—", { size: 8.5 });

  // 7. Important note
  s.gap(6);
  s.rule();
  s.label("7. Important note");
  s.body(
    "This summary is generated locally from information you entered. It is an organizational aid and not a government document. The reference numbers inside are not official complaint numbers. Verify all dates, amounts and references against your bank records before submitting to the police, your bank or the regulator.",
    { size: 8 },
  );
  s.body(
    "Files attached in the Evidence Vault are stored in this browser only and are not included in this PDF. Clearing site data can delete them. A SHA-256 value is an integrity fingerprint, not proof of origin or authenticity.",
    { size: 7.5 },
  );

  s.save(`kavach-evidence-${c.ref}.pdf`);
}
