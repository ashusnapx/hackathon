"use client";

import { jsPDF } from "jspdf";
import { findCategory, findSubcategory } from "./categories";
import { appendLetter } from "./letter";
import { TRACKS, liveTracks } from "./tracks";
import type { CaseFile } from "./types";

/**
 * The case pack — one PDF the citizen carries to the police station.
 *
 * Deliberately English-only: it exists to be read across a counter by an officer
 * or a bank manager, and jsPDF's core fonts cannot render Indic scripts without
 * embedding a megabyte of font per language. The vernacular copy lives on screen,
 * where the citizen reads it before they sign.
 */

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

  /** Hand the open document to the letter typesetter and take it back after. */
  handOff(): { doc: jsPDF; page: number } {
    this.footer();
    return { doc: this.doc, page: this.page };
  }
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function buildCasePack(c: CaseFile): jsPDF {
  const s = new Sheet();
  const cat = findCategory(c.triage?.categoryId);
  const sub = findSubcategory(c.triage?.categoryId, c.triage?.subcategoryId);

  // ── Cover ────────────────────────────────────────────────────────────────
  s.label("Cyber fraud case pack");
  s.heading(c.ref, 26);
  s.gap(2);
  s.body(
    "This pack was prepared by the complainant. It is not a government document and the reference above is not an official complaint number.",
    { size: 8.5 },
  );
  s.gap(6);
  s.rule();

  s.label("The case");
  s.kv([
    ["Category", cat?.label ?? "—"],
    ["Type", sub?.label ?? "—"],
    ["Incident", fmt(c.incidentAt || c.triage?.incidentAt)],
    ["Reported", fmt(c.createdAt)],
    ["Amount lost", c.amount ? `Rs. ${c.amount.toLocaleString("en-IN")}` : "—"],
  ]);

  s.gap(2);
  s.label("Complainant");
  s.kv([
    ["Name", c.victim.name ?? "—"],
    ["Mobile", c.victim.phone ?? "—"],
    ["Email", c.victim.email ?? "—"],
    ["District, State", [c.victim.district, c.victim.state].filter(Boolean).join(", ") || "—"],
    ["Address", c.victim.address ?? "—"],
  ]);

  if (c.bank.name || c.bank.last4) {
    s.gap(2);
    s.label("Account affected");
    s.kv([
      ["Bank", c.bank.name ?? "—"],
      ["Account ending", c.bank.last4 ?? "—"],
      ["Bank notified on", c.bank.notifiedAt ? fmt(c.bank.notifiedAt) : "not yet"],
      ["Bank reference", c.bank.ackRef ?? "—"],
    ]);
  }

  s.gap(2);
  s.label("Suspect identifiers");
  s.kv([
    ["Phone", c.suspect.phones.join(", ") || "—"],
    ["UPI ID", c.suspect.upiIds.join(", ") || "—"],
    ["Account", c.suspect.accounts.join(", ") || "—"],
    ["Links", c.suspect.urls.join(", ") || "—"],
    ["Handles", c.suspect.handles.join(", ") || "—"],
    ["Transaction refs", c.entities.refs.join(", ") || "—"],
  ]);

  // ── Deadlines ────────────────────────────────────────────────────────────
  s.break();
  s.label("Deadlines");
  s.heading("Where this case stands", 16);
  s.gap(3);

  const live = liveTracks(c);
  for (const track of live) {
    if (track.state === "na") continue;
    const def = TRACKS.find((d) => d.id === track.def.id)!;

    s.body(
      `${track.state === "done" ? "[done]" : track.state === "missed" ? "[MISSED]" : "[  ]"}  ${
        def.id.toUpperCase()
      }`,
      { mono: true, size: 9 },
    );
    s.body(
      `${track.deadline
        ? `${track.dateKind === "opens"
          ? "Eligible to file from"
          : def.id === "ombudsman"
            ? "Ordinary filing limit"
            : "Due"} ${fmt(track.deadline.toISOString())}`
        : "No fixed date"}`,
      { size: 8.5 },
    );
    s.gap(3);
  }

  // ── Statement ────────────────────────────────────────────────────────────
  s.break();
  s.label("Statement");
  s.heading("In the complainant's own words", 16);
  s.gap(3);
  s.body(c.rawStatement || "—");

  if (c.triage?.englishNarrative) {
    s.gap(6);
    s.label("Rendered into English");
    s.gap(2);
    s.body(c.triage.englishNarrative);
  }

  if (c.files.length) {
    s.gap(6);
    s.label("Evidence held by the complainant");
    s.gap(2);
    c.files.forEach((f, i) => s.body(`${i + 1}.  ${f.name}  (${(f.size / 1024).toFixed(0)} KB)`, { mono: true, size: 8.5 }));
  }

  // ── Documents ────────────────────────────────────────────────────────────
  const docs: [string, string | undefined][] = [
    ["NCRP complaint description", c.docs.ncrp],
    ["1930 call script", c.docs.script],
    ["Letter to the bank", c.docs.bank],
    ["FIR application", c.docs.fir],
    ["Chakshu report", c.docs.chakshu],
    ["Money restoration request", c.docs.mrm],
    ["Ombudsman complaint", c.docs.ombudsman],
  ];

  // The letters are typeset rather than dumped as monospace: the pack is what
  // gets carried to a counter, and each document in it has to read as the
  // document it claims to be.
  const handed = s.handOff();
  let page = handed.page;
  for (const [title, body] of docs) {
    if (!body) continue;
    page = appendLetter(handed.doc, page, body, { title });
  }

  return handed.doc;
}

export function downloadCasePack(c: CaseFile) {
  buildCasePack(c).save(`kavach-${c.ref}.pdf`);
}

/** Same pack, returned rather than saved — for tests. */
export function casePackBytes(c: CaseFile): ArrayBuffer {
  return buildCasePack(c).output("arraybuffer");
}
