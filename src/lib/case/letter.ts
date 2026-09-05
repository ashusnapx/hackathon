"use client";

import { jsPDF } from "jspdf";

/**
 * Turning a generated document into something a person can hand across a counter.
 *
 * The documents come out of the model and the rule engine as plain text, because
 * plain text is what survives being pasted into a portal box. But a citizen who
 * downloads an FIR application needs a *letter* — margins, a subject line that
 * reads as one, numbered paragraphs that hang, a signature block with room to
 * sign, and an acknowledgement box a clerk can stamp. A .txt file printed from
 * a phone is not that, and a counter clerk reads it as not that.
 *
 * So this module does two things: recognise the structure already present in the
 * text, and typeset it. The parser is deliberately timid — anything it cannot
 * classify becomes an ordinary paragraph, which is exactly what it renders as
 * today. It can improve the output; it cannot make it worse.
 *
 * English only, and that is a real limit rather than an oversight: jsPDF's core
 * fonts cannot draw Devanagari or Tamil, and embedding a face per script would
 * add a megabyte per language to a bundle meant for a 2G connection. The
 * vernacular copy stays on screen, where the citizen reads what they are signing
 * before they sign the English one.
 */

// ── Structure ───────────────────────────────────────────────────────────────

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "subject"; text: string }
  | { kind: "address"; lines: string[] }
  | { kind: "meta"; text: string }
  | { kind: "salutation"; text: string }
  | { kind: "para"; text: string }
  | { kind: "numbered"; marker: string; text: string; depth: number }
  | { kind: "kv"; rows: [string, string][] }
  | { kind: "signature"; lines: string[] }
  | { kind: "box"; title: string; lines: string[] }
  | { kind: "space" };

const RX = {
  numbered: /^(\s*)((?:\d{1,2}|[a-z]|[ivx]{1,4})[.)])\s+(.*)$/i,
  kv: /^\s{2,}([A-Za-z][A-Za-z ,'()/-]{2,44}?):\s{1,}(.+)$/,
  subject: /^\s*Subject\s*:\s*(.*)$/i,
  meta: /^\s*(Date|Ref|Reference|Copy to)\s*:\s*(.*)$/i,
  salutation: /^\s*(Sir\s*\/\s*Madam|Sir|Madam|Respected\s+.+|Dear\s+.+)\s*,?\s*$/i,
  signOff: /^\s*(Yours faithfully|Yours sincerely|Yours truly|Thanking you)\s*,?\s*$/i,
  boxTitle: /^\s*(ACKNOWLEDGEMENT|FOR OFFICE USE|OFFICE USE ONLY)\b(.*)$/i,
  allCaps: /^[A-Z0-9][A-Z0-9 .,'’&()\/—–-]{4,}$/,
};

/** A heading is a short all-caps line that is not a sentence of shouting. */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 4 || t.length > 72) return false;
  if (!RX.allCaps.test(t)) return false;
  return !/[.?!]$/.test(t) || t.endsWith("—");
}

/**
 * Put the line structure back when it never arrived.
 *
 * The model is asked for a laid-out letter and usually returns one, but not
 * always — sometimes a whole application comes back as a single run-on
 * paragraph. The typesetter reads structure from line breaks, so that input
 * renders as one grey slab no matter how good the renderer is.
 *
 * Rather than hope the model behaves, this restores the breaks from the parts
 * of the document that are fixed by convention: an addressee block, a dated
 * subject line, numbered paragraphs, a sign-off, an acknowledgement. It only
 * runs on text that is visibly under-broken, so a well-formed document passes
 * through untouched.
 */
export function reflow(input: string): string {
  const text = (input || "").trim();
  if (!text) return text;

  // Roughly one break per sentence is what a laid-out letter looks like. Well
  // above that, leave it alone — reflowing good input can only make it worse.
  const breaks = (text.match(/\n/g) || []).length;
  if (breaks >= Math.max(6, text.length / 400)) return text;

  let out = text.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ");

  // Addressee block: "To, A, B, C." up to the first Date or Subject.
  out = out.replace(
    /^To,\s*(.+?)(?=\s(?:Date|Subject|Ref)\s*:)/i,
    (_m, block: string) =>
      `To,\n${block.replace(/\s*,\s*/g, "\n").replace(/\.\s*$/, "").trim()}\n\n`,
  );

  out = out
    .replace(/\s*(Date\s*:\s*[^.]+?)\.?\s+(?=Subject\s*:)/i, "\n\n$1\n\n")
    .replace(/\s*(Subject\s*:\s*.+?\.)\s+(?=Respected|Sir|Madam|Dear|To the)/i, "\n$1\n\n")
    .replace(/\s*(Respected\s+Sir(?:\s+or\s+Madam)?|Sir\s*\/?\s*(?:or\s+)?Madam|Dear\s+Sir(?:\s*\/\s*Madam)?)\s*,\s*/i, "\n\n$1,\n\n")
    // Numbered paragraphs, wherever they sit in the run.
    .replace(/\s+(\d{1,2}\.)\s+(?=[A-Z(])/g, "\n\n$1 ")
    .replace(/\s+([a-z]\.)\s+(?=[a-z(])/g, "\n   $1 ")
    .replace(/\s*(Enclosures?\s*:)\s*/i, "\n\n$1\n")
    .replace(/\s*(Yours\s+(?:faithfully|sincerely|truly))\s*,\s*/i, "\n\n$1,\n\n")
    // No full stop inside the run: "[NCRP Acknowledgement Number]. Yours
    // faithfully, … Phone:" would otherwise match as one heading and swallow
    // the end of a paragraph and the whole signature block with it.
    .replace(/\s*(Acknowledgement[^:.\n]{0,40}:)\s*/i, "\n\n$1\n")
    .replace(/\s*(Signature of[^.]+?\.)\s*/i, "\n$1\n");

  // A run of "Label: value," particulars becomes one indented line each — this
  // is what the kv renderer turns into an aligned table.
  out = out.replace(/(?:^|\n)([^\n]{0,90}?(?:as follows|are)\s*:)\s*([^\n]+)/gi, (m, lead: string, rest: string) => {
    const parts = rest.split(/,\s*(?=[A-Z][A-Za-z ()/-]{2,40}\s*:)/);
    if (parts.length < 2) return m;
    const last = parts[parts.length - 1];
    const tail = last.match(/\.\s+(.*)$/);
    if (tail) parts[parts.length - 1] = last.slice(0, last.length - tail[1].length - 1);
    const rows = parts.map((r) => `   ${r.replace(/[.,]\s*$/, "").trim()}`).join("\n");
    return `\n${lead}\n${rows}\n${tail ? `\n${tail[1]}` : ""}`;
  });

  out = out.replace(/\n{3,}/g, "\n\n").trim();

  // Reflow may only change layout. Every rule above is a regular expression
  // over legal prose, and a greedy one that swallows a clause would silently
  // delete part of a document somebody signs and hands to the police. So the
  // result is checked against the input word for word, and any rule that loses,
  // reorders or invents one forfeits: the original text is returned and renders
  // as it always did. A plain letter is a far better failure than a
  // confident-looking one with a paragraph missing.
  if (words(out) !== words(text)) return text;
  return out;
}

/**
 * The words, in order, lowercased. Reflow may re-space and re-punctuate — an
 * addressee run becomes separate lines and loses its commas — but it must never
 * drop, reorder or invent a word.
 */
const words = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) || []).join(" ");

export function parseLetter(input: string): Block[] {
  const raw = reflow((input || "").replace(/\r\n/g, "\n")).split("\n");
  const out: Block[] = [];

  let i = 0;
  let kv: [string, string][] = [];
  let para: string[] = [];

  const flushKv = () => {
    if (kv.length) {
      out.push({ kind: "kv", rows: kv });
      kv = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      out.push({ kind: "para", text: para.join(" ").replace(/\s+/g, " ").trim() });
      para = [];
    }
  };
  const flush = () => {
    flushPara();
    flushKv();
  };

  while (i < raw.length) {
    const line = raw[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      // Collapse runs of blank lines into one measured gap.
      if (out.length && out[out.length - 1].kind !== "space") out.push({ kind: "space" });
      i += 1;
      continue;
    }

    // A "To," block runs until the first blank line.
    if (/^To\s*,?\s*$/i.test(trimmed)) {
      flush();
      const lines: string[] = [];
      i += 1;
      // Stops at a blank line, and also at anything that is obviously the next
      // part of the letter. Reflowed text does not always carry the blank, and
      // an address block that swallows the subject line loses it entirely.
      while (
        i < raw.length &&
        raw[i].trim() &&
        !RX.meta.test(raw[i].trim()) &&
        !RX.subject.test(raw[i].trim()) &&
        !RX.salutation.test(raw[i].trim()) &&
        !RX.numbered.test(raw[i])
      ) {
        lines.push(raw[i].trim());
        i += 1;
      }
      out.push({ kind: "address", lines });
      continue;
    }

    // A boxed block — acknowledgement, office use — runs to the end of its run.
    const box = trimmed.match(RX.boxTitle);
    if (box) {
      flush();
      const title = [box[1], box[2]].join(" ").trim();
      const lines: string[] = [];
      i += 1;
      while (i < raw.length && raw[i].trim()) {
        lines.push(raw[i].trim());
        i += 1;
      }
      out.push({ kind: "box", title, lines });
      continue;
    }

    const subject = trimmed.match(RX.subject);
    if (subject) {
      flush();
      // Subject lines wrap across several source lines; gather the indented rest.
      const parts = [subject[1]];
      i += 1;
      while (i < raw.length && raw[i].trim() && /^\s{4,}/.test(raw[i])) {
        parts.push(raw[i].trim());
        i += 1;
      }
      out.push({ kind: "subject", text: parts.join(" ").replace(/\s+/g, " ").trim() });
      continue;
    }

    if (RX.meta.test(trimmed)) {
      flush();
      out.push({ kind: "meta", text: trimmed });
      i += 1;
      continue;
    }

    if (RX.salutation.test(trimmed)) {
      flush();
      out.push({ kind: "salutation", text: trimmed.replace(/,?\s*$/, ",") });
      i += 1;
      continue;
    }

    if (RX.signOff.test(trimmed)) {
      flush();
      const lines = [trimmed.replace(/,?\s*$/, ",")];
      i += 1;
      // These letters leave blank lines under the sign-off for the signature
      // itself, so the name below it is part of the same block, not a new
      // paragraph. Skip the gap, then take the run that follows.
      while (i < raw.length && !raw[i].trim()) i += 1;
      while (i < raw.length && raw[i].trim() && !RX.boxTitle.test(raw[i].trim())) {
        lines.push(raw[i].trim());
        i += 1;
      }
      out.push({ kind: "signature", lines });
      continue;
    }

    const num = line.match(RX.numbered);
    if (num) {
      flush();
      const depth = Math.min(2, Math.floor(num[1].length / 3));
      // A numbered item continues onto indented lines beneath it.
      const parts = [num[3]];
      i += 1;
      while (
        i < raw.length &&
        raw[i].trim() &&
        !RX.numbered.test(raw[i]) &&
        !RX.kv.test(raw[i]) &&
        /^\s{3,}/.test(raw[i])
      ) {
        parts.push(raw[i].trim());
        i += 1;
      }
      out.push({ kind: "numbered", marker: num[2], text: parts.join(" ").replace(/\s+/g, " ").trim(), depth });
      continue;
    }

    const pair = line.match(RX.kv);
    if (pair) {
      flushPara();
      kv.push([pair[1].trim(), pair[2].trim()]);
      i += 1;
      continue;
    }

    if (isHeading(trimmed)) {
      flush();
      out.push({ kind: "heading", text: trimmed });
      i += 1;
      continue;
    }

    flushKv();
    para.push(trimmed);
    i += 1;
  }

  flush();
  // Trailing gap serves no purpose on a page.
  while (out.length && out[out.length - 1].kind === "space") out.pop();
  return out;
}

// ── Typesetting ─────────────────────────────────────────────────────────────
/**
 * Anything the citizen still has to fill in by hand.
 *
 * Square-bracketed gaps the drafter left ("[your account number]") and the
 * ruled blanks a clerk signs on. These are printed and completed with a pen, so
 * they are set in a light grey: dark enough to read as an instruction, light
 * enough that handwriting over the top is what the eye lands on. Printing them
 * at full black gives you a form nobody can fill in legibly.
 */
const PLACEHOLDER = /(\[[^\]\n]{1,80}\]|_{3,})/g;
const PLACEHOLDER_GREY = 168;


const SITE_URL = "https://cybercrime-assistant.vercel.app";
const SITE_LABEL = "cybercrime-assistant.vercel.app";

const PAGE = { w: 210, h: 297, m: 22 };
const BODY = 10.5;
const LEAD = 5.0;

interface Meta {
  /** Shown small at the head of the first page. */
  title: string;
}

class Letter {
  readonly doc: jsPDF;
  private y = PAGE.m;
  private page = 1;
  private readonly width = PAGE.w - PAGE.m * 2;

  /**
   * `into` lets the case pack append a typeset letter to a document already in
   * progress, so the bundle a citizen carries to the station is set the same way
   * as the single letter they download.
   */
  constructor(private meta: Meta, into?: { doc: jsPDF; page: number }) {
    this.doc = into?.doc ?? new jsPDF({ unit: "mm", format: "a4" });
    if (into) {
      this.doc.addPage();
      this.page = into.page + 1;
    }
    this.masthead();
  }

  get pageNumber() {
    return this.page;
  }

  /**
   * The head of the page carries what the document is, and nothing else.
   *
   * A Kavach case reference used to sit in the top right, where a file number
   * goes on an official form — which is exactly the reading it invited. This
   * is the applicant's own letter to their bank or their station, so it leaves
   * here looking like one, and our reference stays on our screen where it is
   * of use to them and to nobody at the counter.
   */
  private masthead() {
    const d = this.doc;
    d.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(130);
    d.text(this.meta.title.toUpperCase(), PAGE.m, this.y);
    this.y += 2.5;
    d.setDrawColor(190).setLineWidth(0.2).line(PAGE.m, this.y, PAGE.w - PAGE.m, this.y);
    this.y += 8;
    d.setTextColor(0);
  }

  /**
   * Drawn mid-block whenever a page fills up, so it has to put the graphics
   * state back exactly as it found it. Without this a paragraph that breaks
   * across a page continues in the footer's small grey sans.
   */
  private footer() {
    const d = this.doc;
    const font = d.getFont();
    const size = d.getFontSize();

    // A quiet mark, set in the gutter rather than across the page. A letter with
    // a banner over it reads as a template; this has to read as the applicant's
    // own document while still saying where it came from.
    d.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(178);
    const markY = PAGE.h - 15.5;
    d.text(SITE_LABEL, PAGE.m, markY);
    // A live link, so someone handed a printed copy can still find the tool from
    // the PDF. jsPDF places the hotspot from the top-left of the box, not the
    // text baseline, hence the offset by the cap height.
    d.link(PAGE.m, markY - 2.4, d.getTextWidth(SITE_LABEL), 3.4, { url: SITE_URL });

    d.setFontSize(7).setTextColor(140);
    d.text(
      "Prepared with Kavach, an independent tool. This is your own letter, not a government document.",
      PAGE.m,
      PAGE.h - 11,
    );
    d.text(String(this.page), PAGE.w - PAGE.m, PAGE.h - 11, { align: "right" });

    d.setTextColor(0).setFont(font.fontName, font.fontStyle).setFontSize(size);
  }

  private room(mm: number) {
    if (this.y + mm <= PAGE.h - PAGE.m - 8) return;
    this.footer();
    this.doc.addPage();
    this.page += 1;
    this.y = PAGE.m;
  }

  /**
   * Draw one already-wrapped line, switching to grey across placeholder runs.
   * jsPDF paints a whole string in one colour, so the line is split and the
   * segments are laid down in sequence at a running x.
   */
  private drawLine(text: string, x: number, y: number) {
    const d = this.doc;
    if (!PLACEHOLDER.test(text)) {
      PLACEHOLDER.lastIndex = 0;
      d.text(text, x, y);
      return;
    }
    PLACEHOLDER.lastIndex = 0;
    let cursor = x;
    for (const part of text.split(PLACEHOLDER)) {
      if (!part) continue;
      const isGap = part.startsWith("[") || /^_{3,}$/.test(part);
      if (isGap) d.setTextColor(PLACEHOLDER_GREY);
      d.text(part, cursor, y);
      if (isGap) d.setTextColor(0);
      cursor += d.getTextWidth(part);
    }
  }

  /** Wrapped text at an indent, returning the height consumed. */
  private lines(text: string, opts: { x?: number; w?: number; size?: number; style?: "normal" | "bold" | "italic"; font?: "times" | "helvetica"; lead?: number }) {
    const { x = PAGE.m, w = this.width, size = BODY, style = "normal", font = "times", lead = LEAD } = opts;
    const d = this.doc;
    d.setFont(font, style).setFontSize(size).setTextColor(0);
    const parts = d.splitTextToSize(text, w) as string[];
    for (const p of parts) {
      this.room(lead);
      this.drawLine(p, x, this.y);
      this.y += lead;
    }
  }

  gap(mm = 3) {
    this.y += mm;
  }

  render(blocks: Block[]) {
    for (const b of blocks) {
      switch (b.kind) {
        case "space":
          this.gap(2.5);
          break;

        case "heading":
          this.gap(2);
          this.room(7);
          this.lines(b.text, { font: "helvetica", style: "bold", size: 9, lead: 4.6 });
          this.gap(1.5);
          break;

        case "address":
          this.room(b.lines.length * LEAD + 6);
          this.lines("To,", { style: "normal" });
          for (const l of b.lines) this.lines(l, {});
          this.gap(3);
          break;

        case "meta":
          this.lines(b.text, { font: "helvetica", size: 9.5, lead: 4.8 });
          break;

        case "subject": {
          this.gap(3);
          const d = this.doc;
          d.setFont("times", "bold").setFontSize(BODY);
          const label = "Subject: ";
          const labelW = d.getTextWidth(label);
          this.room(LEAD * 2);
          d.text(label, PAGE.m, this.y);
          const wrapped = d.splitTextToSize(b.text, this.width - labelW) as string[];
          wrapped.forEach((line, i) => {
            if (i) {
              this.room(LEAD);
              this.y += LEAD;
            }
            this.drawLine(line, PAGE.m + labelW, this.y);
          });
          this.y += LEAD;
          this.gap(3.5);
          break;
        }

        case "salutation":
          this.gap(1.5);
          this.lines(b.text, {});
          this.gap(2);
          break;

        case "para":
          this.lines(b.text, {});
          this.gap(2.2);
          break;

        case "numbered": {
          // Hanging indent: the marker sits in the margin of its own text block,
          // which is what makes a numbered legal paragraph scannable.
          const indent = 6 + b.depth * 7;
          const d = this.doc;
          d.setFont("times", "normal").setFontSize(BODY);
          this.room(LEAD * 2);
          // Right-align the marker against the text column, so "1." and "10."
          // both sit flush and the prose starts on one line.
          d.text(b.marker, PAGE.m + indent - 2.5, this.y, { align: "right" });
          const wrapped = d.splitTextToSize(b.text, this.width - indent) as string[];
          wrapped.forEach((line, i) => {
            if (i) {
              this.room(LEAD);
              this.y += LEAD;
            }
            this.drawLine(line, PAGE.m + indent, this.y);
          });
          this.y += LEAD;
          this.gap(1.8);
          break;
        }

        case "kv": {
          const d = this.doc;
          const labelW = Math.min(
            58,
            Math.max(...b.rows.map((r) => {
              d.setFont("helvetica", "normal").setFontSize(9);
              return d.getTextWidth(r[0]);
            })) + 6,
          );
          this.gap(1);
          for (const [k, v] of b.rows) {
            this.room(LEAD + 1);
            d.setFont("helvetica", "normal").setFontSize(9).setTextColor(95);
            d.text(k, PAGE.m + 2, this.y);
            d.setTextColor(0).setFont("times", "normal").setFontSize(BODY);
            const wrapped = d.splitTextToSize(v || "—", this.width - labelW - 4) as string[];
            wrapped.forEach((line, i) => {
              if (i) {
                this.room(LEAD);
                this.y += LEAD;
              }
              this.drawLine(line, PAGE.m + labelW, this.y);
            });
            this.y += LEAD + 0.8;
          }
          this.gap(1.5);
          break;
        }

        case "signature":
          this.gap(6);
          this.room(LEAD * (b.lines.length + 2) + 10);
          this.lines(b.lines[0], {});
          // Room to actually sign, which a text file never leaves.
          this.gap(13);
          for (const l of b.lines.slice(1)) this.lines(l, {});
          this.gap(2);
          break;

        case "box": {
          const d = this.doc;
          const inner = b.lines.length * LEAD + 12;
          this.gap(5);
          this.room(inner + 4);
          const top = this.y - 4;
          d.setDrawColor(150).setLineWidth(0.25);
          d.rect(PAGE.m, top, this.width, inner);
          this.y += 2;
          d.setFont("helvetica", "bold").setFontSize(8).setTextColor(60);
          d.text(b.title.toUpperCase(), PAGE.m + 4, this.y);
          this.y += 5.5;
          d.setTextColor(0);
          for (const l of b.lines) this.lines(l, { x: PAGE.m + 4, w: this.width - 8, size: 9.5, font: "times" });
          this.y = top + inner + 4;
          break;
        }
      }
    }
  }

  finish() {
    this.footer();
    return this.doc;
  }
}

function build(text: string, meta: Meta): jsPDF {
  const letter = new Letter(meta);
  letter.render(parseLetter(text));
  return letter.finish();
}

export function downloadLetter(text: string, opts: Meta & { filename: string }) {
  build(text, { title: opts.title }).save(opts.filename);
}

/** Same typesetting, returned rather than saved — for tests and for previews. */
export function letterBytes(text: string, meta: Meta): ArrayBuffer {
  return build(text, meta).output("arraybuffer");
}

/**
 * Append a typeset letter to an open document, on a fresh page.
 * Returns the page number it ended on, so the caller can keep counting.
 */
export function appendLetter(doc: jsPDF, page: number, text: string, meta: Meta): number {
  const letter = new Letter(meta, { doc, page });
  letter.render(parseLetter(text));
  letter.finish();
  return letter.pageNumber;
}
