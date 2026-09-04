/**
 * Generate the knowledge-base .txt uploaded to the Vaani console.
 *
 * Vaani accepts one plain-text file (max 1 MB) as the agent's only reference
 * document, and the launch requirement is that Kavach Saathi answers *only*
 * from an official, versioned Kavach knowledge base. That file cannot be typed
 * by hand. A rule typed here would become a fourth copy of something that
 * already exists in docs/LEGAL_BASIS.md, in the citizen-facing dictionary and
 * in the deadline engines — and copies drift. A drifted copy means the voice
 * agent states a deadline or a liability rule differently from the website,
 * which is the exact failure this product exists to prevent.
 *
 * So nothing is hardcoded here. Every statement is read from its source:
 *
 *   docs/LEGAL_BASIS.md           legal propositions, approved disclaimers,
 *                                 verification register, source governance
 *   docs/VAANI_AGENT_PROMPT.md    runtime gates, tool result-state truths
 *   docs/vaani-agent-config.json  Vaani console settings: dynamic variables,
 *                                 dispositions, extracted fields, model stack
 *   src/lib/i18n/dict/en.ts       the wording already shown to citizens
 *   src/lib/i18n/languages.ts     supported languages and BCP-47 tags
 *   src/lib/case/categories.ts    routing taxonomy (NCRP category tree)
 *   src/lib/case/tracks.ts        remedy tracks and their official sources
 *   src/lib/legal/rbi.ts          RBI/2017-18/15 screening and explanations
 *   src/lib/legal/ombudsman.ts    RB-IOS-2026 filing window
 *
 * Internal pre-launch notes ("Counsel/operations gap") are dropped: they are
 * instructions to Kavach's lawyers, not answers for a caller.
 *
 *   node scripts/gen-vaani-kb.mjs
 *   node scripts/gen-vaani-kb.mjs --check   # fail if the committed file is stale
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs/vaani-knowledge-base.txt");
const MAX_BYTES = 1024 * 1024;
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

// ── markdown → plain text ───────────────────────────────────────────────────
// The agent reads this as prose. Pipes and asterisks are noise; a link is only
// useful if the URL survives next to the words that describe it.

function mdInline(s) {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 <$2>")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderTable(rows) {
  const cells = rows.map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => mdInline(c)));
  const head = cells[0];
  const body = cells.filter((r, i) => i > 0 && !/^-+$/.test(r[0].replace(/[\s:]/g, "")));
  return body
    .map((row) => {
      const first = `  - ${row[0]}`;
      const rest = row
        .slice(1)
        .map((c, i) => (c ? `      ${head[i + 1] || "note"}: ${c}` : null))
        .filter(Boolean);
      return [first, ...rest].join("\n");
    })
    .join("\n");
}

function mdToText(md) {
  const out = [];
  let table = [];
  let fence = false;
  const flush = () => {
    if (table.length) out.push(renderTable(table));
    table = [];
  };
  for (const raw of md.split("\n")) {
    if (/^\s*```/.test(raw)) {
      flush();
      fence = !fence;
      continue;
    }
    if (fence) {
      out.push("    " + raw);
      continue;
    }
    if (/^\s*\|/.test(raw)) {
      table.push(raw.trim());
      continue;
    }
    flush();
    let line = raw.replace(/^>\s?/, "");
    const heading = line.match(/^(#{2,6})\s+(.*)$/);
    if (heading) {
      out.push("", mdInline(heading[2]).toUpperCase(), "-".repeat(Math.min(mdInline(heading[2]).length, 72)));
      continue;
    }
    out.push(mdInline(line));
  }
  flush();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\s+$/g, "");
}

/** Body of a `## `/`### ` section, up to the next heading of the same or higher level. */
function section(md, startsWith) {
  const lines = md.split("\n");
  const at = lines.findIndex((l) => {
    const m = l.match(/^(#{2,4})\s+(.*)$/);
    return m && mdInline(m[2]).toLowerCase().startsWith(startsWith.toLowerCase());
  });
  if (at === -1) throw new Error(`section not found in source document: "${startsWith}"`);
  const level = lines[at].match(/^(#+)/)[1].length;
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  // Counsel/operations gaps are pre-launch legal to-dos, not caller answers.
  const body = lines
    .slice(at + 1, end)
    .filter((l) => !/^\*\*Counsel\/operations gap/.test(l))
    .join("\n");
  return mdToText(body);
}

/** First sentence matching a pattern, taken from the source document. */
function sentence(md, pattern) {
  const hit = md.split("\n").flatMap((l) => l.split(/(?<=\.)\s+/)).find((s) => pattern.test(s));
  if (!hit) throw new Error(`sentence not found: ${pattern}`);
  return mdInline(hit);
}

/** A curly-quoted span, lifted whole rather than cut at a sentence boundary. */
function quoted(md, pattern) {
  const hit = [...md.matchAll(/[\u201c]([^\u201d]+)[\u201d]/g)].map((m) => m[1]).find((s) => pattern.test(s));
  if (!hit) throw new Error(`quotation not found: ${pattern}`);
  return mdInline(hit);
}

// ── TypeScript source parsing ──────────────────────────────────────────────
// Regex, not a compiler: these files are generated-adjacent data literals and
// gen-loader.mjs already reads them the same way.

function parseObj(text) {
  const o = {};
  for (const m of text.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):\s*(.+?),?\s*$/gm)) {
    let v = m[2].trim().replace(/,$/, "");
    if (/^".*"$/.test(v)) v = v.slice(1, -1);
    else if (/^\[.*\]$/.test(v)) v = [...v.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    else if (/^-?\d+$/.test(v)) v = Number(v);
    else if (v === "true" || v === "false") v = v === "true";
    o[m[1]] = v;
  }
  return o;
}

function dictEntries(src) {
  const d = new Map();
  for (const m of src.matchAll(/^\s*"([\w.\-]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
    d.set(m[1], m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n"));
  }
  if (d.size < 100) throw new Error(`dictionary parse looks wrong: ${d.size} keys`);
  return d;
}

function blocksOf(src, marker) {
  return src
    .slice(src.indexOf(marker))
    .split(/\n {2}\{\n/)
    .slice(1);
}

function parseCategories(src) {
  const arrays = {};
  for (const m of src.matchAll(/const ([A-Z_]+): TrackId\[\] = \[([\s\S]*?)\];/g)) {
    arrays[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  }
  return blocksOf(src, "export const CATEGORIES").map((b) => {
    const field = (k) => (b.match(new RegExp(`^ {4}${k}: "([^"]*)"`, "m")) || [])[1];
    const ref = (b.match(/^ {4}tracks: ([A-Z_]+)/m) || [])[1];
    return {
      id: field("id"),
      label: field("label"),
      blurb: field("blurb"),
      portalTrack: field("portalTrack"),
      tracks: arrays[ref] || [],
      subcategories: [...b.matchAll(/^ {6}\{ id: "([^"]+)", label: "([^"]+)"/gm)].map((m) => ({
        id: m[1],
        label: m[2],
      })),
    };
  });
}

function parseTracks(src, imported = {}) {
  const consts = { ...imported };
  for (const m of src.matchAll(/export const ([A-Z0-9_]+) = \{([\s\S]*?)\} as const;/g)) {
    consts[m[1]] = parseObj(m[2]);
  }
  const tracks = blocksOf(src, "export const TRACKS").map((b) => {
    const field = (k) => (b.match(new RegExp(`^ {4}${k}: "([^"]*)"`, "m")) || [])[1];
    const flag = (k) => new RegExp(`^ {4}${k}: true`, "m").test(b);
    const srcName = (b.match(/^ {4}source: ([A-Z0-9_]+),/m) || b.match(/\.\.\.([A-Z0-9_]+),/) || [])[1];
    const override = (b.match(/^ {6}provisions: \[([^\]]*)\]/m) || [])[1];
    return {
      id: field("id"),
      index: Number((b.match(/^ {4}index: (\d+)/m) || [])[1]),
      titleKey: field("titleKey"),
      whyKey: field("whyKey"),
      howKey: field("howKey"),
      dueKey: field("dueKey"),
      href: (b.match(/^ {4}action: \{ href: "([^"]+)"/m) || [])[1],
      financialOnly: flag("financialOnly"),
      immediate: flag("immediate"),
      conditionalOnRbi: flag("requiresRbiUnauthorisedTransaction"),
      workingDayEstimate: flag("workingDayEstimate"),
      blockedBy: field("blockedBy"),
      source: srcName && consts[srcName]
        ? { ...consts[srcName], ...(override ? { provisions: [...override.matchAll(/"([^"]+)"/g)].map((x) => x[1]) } : {}) }
        : undefined,
    };
  });
  return { tracks: tracks.filter((t) => t.id), sources: consts };
}

function parseLanguages(src) {
  return [...src.matchAll(/\{\s*code: "([^"]+)",\s*endonym: "([^"]+)",\s*english: "([^"]+)",[\s\S]*?speech: "([^"]+)"\s*\}/g)].map(
    (m) => ({ code: m[1], endonym: m[2], english: m[3], speech: m[4] }),
  );
}

/** The citizen-facing explanations the RBI screening layer already emits. */
function parseRbiExplanations(src) {
  const seen = new Map();
  for (const m of src.matchAll(/explain\(\s*\n\s*"((?:[^"\\]|\\.)*)",\s*\n\s*"([a-z_]+)",\s*\n\s*\[([^\]]*)\]/g)) {
    const text = m[1].replace(/\\"/g, '"');
    if (!seen.has(text)) {
      seen.set(text, { rule: m[2], paragraphs: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]) });
    }
  }
  return [...seen].map(([text, meta]) => ({ text, ...meta }));
}

// ── sources ────────────────────────────────────────────────────────────────
const legal = read("docs/LEGAL_BASIS.md");
const agentDoc = read("docs/VAANI_AGENT_PROMPT.md");
const cfg = JSON.parse(read("docs/vaani-agent-config.json"));
const en = dictEntries(read("src/lib/i18n/dict/en.ts"));
const categories = parseCategories(read("src/lib/case/categories.ts"));
const languages = parseLanguages(read("src/lib/i18n/languages.ts"));
const rbiSrc = read("src/lib/legal/rbi.ts");
const ombSrc = read("src/lib/legal/ombudsman.ts");
const rbiCircular = parseObj((rbiSrc.match(/RBI_2017_CIRCULAR = \{([\s\S]*?)\} as const;/) || [])[1]);
const ombScheme = parseObj((ombSrc.match(/RBI_OMBUDSMAN_2026 = \{([\s\S]*?)\} as const;/) || [])[1]);
const { tracks, sources } = parseTracks(read("src/lib/case/tracks.ts"), {
  RBI_2017_CIRCULAR: rbiCircular,
  RBI_OMBUDSMAN_2026: ombScheme,
});
const rbiExplanations = parseRbiExplanations(rbiSrc);
const dictState = new Map(
  readdirSync(resolve(ROOT, "src/lib/i18n/dict"))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => [
      f.replace(/\.ts$/, ""),
      /not yet reviewed by a native speaker/.test(read(`src/lib/i18n/dict/${f}`))
        ? "machine-translated, unreviewed"
        : "reviewed",
    ]),
);

const lastVerified = (legal.match(/\*\*Last verified:\*\*\s*(.+)$/m) || [])[1].trim();
const kbRequirement = cfg.knowledgeBase.requirement;

// ── assembly ───────────────────────────────────────────────────────────────
const doc = [];
const rule = (c = "=") => c.repeat(78);
const part = (n, title) => doc.push("", rule(), `PART ${n}. ${title.toUpperCase()}`, rule(), "");
const p = (...lines) => doc.push(...lines);
const t = (key) => {
  const v = en.get(key);
  if (!v) throw new Error(`missing dictionary key: ${key}`);
  return v;
};

p(
  rule(),
  "KAVACH — OFFICIAL KNOWLEDGE BASE FOR THE KAVACH SAATHI VOICE AGENT",
  rule(),
  "",
  `Generated by scripts/gen-vaani-kb.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand:`,
  "regenerate it, so the voice agent and the Kavach website never state a rule differently.",
  "",
  `Legal content last verified: ${lastVerified}`,
  "",
  `Upload requirement: ${kbRequirement}`,
  "",
  "Every statement in this document was generated from one of these versioned sources:",
  "  docs/LEGAL_BASIS.md           legal propositions, disclaimers, verification register",
  "  docs/VAANI_AGENT_PROMPT.md    runtime gates and tool result-state truths",
  "  docs/vaani-agent-config.json  Vaani console settings for this agent",
  "  src/lib/i18n/dict/en.ts       wording already shown to citizens on the website",
  "  src/lib/i18n/languages.ts     supported languages and speech tags",
  "  src/lib/case/categories.ts    routing taxonomy",
  "  src/lib/case/tracks.ts        remedy tracks and their official sources",
  "  src/lib/legal/rbi.ts          RBI/2017-18/15 screening logic",
  "  src/lib/legal/ombudsman.ts    RB-IOS-2026 filing window",
);

part(0, "How to use this document");
p(
  "1. Answer factual questions only from this document. It is the whole knowledge base.",
  "2. If the answer is not here, do not reconstruct it from model memory. Say:",
  `     "${quoted(legal, /^I cannot verify that rule from a current official source/)}"`,
  "   Then offer the immediate protective action and a human or official route.",
  "3. State legal categories and provisions as possible or may apply. Never as a decided",
  "   charge, a finding of liability, or a guaranteed outcome.",
  "4. Preserve unknowns. I don't know, I don't remember, I'm not sure and I prefer not to say",
  "   are accurate answers and must survive into the summary unchanged.",
  "5. Never claim something was filed, saved, transferred, deleted, frozen or recovered unless a",
  "   tool returned a verified result state. See the part on tool result states.",
  "6. Numbers, portals and coverage claims here are operational facts with a recheck cadence. See",
  "   the verification register. If a caller says a number or portal did not work, record that;",
  "   do not argue with them about it.",
);

part(1, "Session variables inherited from the website");
p(
  "These arrive with the call. Use them; do not ask the caller to repeat them unless they are missing.",
  "A console default is a placeholder for testing. It is never a fact about the caller on this call",
  "and must never be spoken back to them.",
  "",
);
const varSource = {
  website_session: "supplied by the Kavach web flow for this caller",
  trusted_runtime_config: "server-generated from configuration and consent records; no console default",
};
for (const v of cfg.dynamicVariables) {
  p(
    `  {{${v.name}}}`,
    `      ${v.meaning}`,
    `      Source: ${varSource[v.source] || v.source}`,
    ...(v.consoleDefault ? [`      console placeholder (never speak): ${v.consoleDefault}`] : []),
    "",
  );
}

part(2, "What Kavach is, what it is not, and the approved disclaimers");
p(section(legal, "Approved disclaimer patterns"));
p("", "THE WORDING THE WEBSITE USES WHEN MONEY IS MOVING", "-".repeat(50), "", `  ${t("sos.title")} ${t("sos.body")}`);

part(3, "Claims that must never be made");
p(section(legal, "The core product rule"));

part(4, "Runtime gates enforced outside the model");
p(section(agentDoc, "Non-negotiable runtime gates"));

part(5, "Tool result states");
p(section(agentDoc, "Tool contract expected by the prompt"));

part(6, "Crisis, danger and safeguarding");
p(section(legal, "Crisis and safeguarding decision rules"));

part(7, "Consent, recording and safe channels");
p(section(legal, "Consent and safe-channel baseline"));

part(8, "Restricted data the agent must never take");
p(
  `  ${sentence(legal, /Never collect OTP, PIN, CVV/)}`,
  `  ${sentence(legal, /Never share an OTP, PIN, CVV, password, or banking login/)}`,
  `  ${t("build.you.noId")}`,
  "",
  "  If a caller starts to speak one of these, interrupt politely, do not repeat it, do not write it",
  "  into any field or summary, and record only that restricted data was detected.",
);

part(9, "Languages");
p(
  `Kavach supports ${languages.length} languages. Begin in the caller's preferred language and stay in it.`,
  "Do not switch mid-sentence unless the caller does.",
  "",
  "The Kavach website carries its own wording in each of these. Where that wording is marked",
  "machine-translated and unreviewed, do not quote it as Kavach's approved phrasing: speak from",
  "the verified English wording in this document, in the caller's language.",
  "",
  "  code | language | as the language calls itself | speech tag | website wording",
);
for (const l of languages) {
  p(
    `  ${l.code.padEnd(4)} | ${l.english.padEnd(12)} | ${l.endonym.padEnd(14)} | ${l.speech.padEnd(7)} | ${
      dictState.get(l.code) || "no dictionary"
    }`,
  );
}

part(10, "Routing categories");
p(
  "Use these ids for the possible incident category. A category is a routing guess for Kavach,",
  "never a legal conclusion, and the caller can reject it.",
  "",
);
for (const c of categories) {
  p(
    `${c.id} — ${c.label}`,
    `  ${c.blurb}`,
    `  Portal track: ${c.portalTrack}. Remedy tracks that apply: ${c.tracks.join(", ")}`,
    ...c.subcategories.map((s) => `    ${s.id}: ${s.label}`),
    "",
  );
}

part(11, "The remedy tracks and what may honestly be said about each");
p("This is the wording the Kavach website already shows for each route. Say the same thing.", "");
for (const tr of tracks.sort((a, b) => a.index - b.index)) {
  const flags = [
    tr.immediate ? "urgent product guidance, not a statutory cutoff" : null,
    tr.financialOnly ? "financial-fraud cases only" : null,
    tr.conditionalOnRbi ? "exists only inside the RBI unauthorised-transaction framework" : null,
    tr.workingDayEstimate ? "working-day estimate; bank and branch holidays must be verified" : null,
    tr.blockedBy ? `cannot start before the ${tr.blockedBy} track` : null,
  ].filter(Boolean);
  p(
    `${tr.index}. ${t(tr.titleKey)}   [id: ${tr.id}]`,
    `   Why: ${t(tr.whyKey)}`,
    `   How: ${t(tr.howKey)}`,
    `   Timing: ${t(tr.dueKey)}`,
    ...(tr.href ? [`   Where: ${tr.href}`] : []),
    ...(flags.length ? [`   Caveats: ${flags.join("; ")}`] : []),
    ...(tr.source
      ? [
          `   Official basis: ${tr.source.title}${tr.source.provisions ? `, ${
            tr.source.provisions.length > 1 ? "provisions" : "provision"
          } ${tr.source.provisions.join(", ")}` : ""}${tr.source.effectiveOn ? `, effective ${tr.source.effectiveOn}` : ""}`,
          `   Source: ${tr.source.url}`,
          ...(tr.source.faqUrl ? [`   Official FAQ: ${tr.source.faqUrl}`] : []),
        ]
      : []),
    "",
  );
}

part(12, "Official source directory");
p("Only these official destinations may be named. Never send a caller to any other link.", "");
for (const [name, s] of Object.entries(sources)) {
  if (!s.url) continue;
  p(
    `  ${s.title || name}`,
    `    ${s.url}`,
    ...(s.faqUrl ? [`    FAQ: ${s.faqUrl}`] : []),
    ...(s.effectiveOn ? [`    Effective: ${s.effectiveOn}`] : []),
    ...(s.provisions ? [`    Provisions: ${s.provisions.join(", ")}`] : []),
    "",
  );
}
for (const s of [rbiCircular, ombScheme]) {
  p(
    `  ${s.title}${s.number ? ` (${s.number})` : ""}${s.id ? ` [${s.id}]` : ""}`,
    `    ${s.url}`,
    ...(s.faqUrl ? [`    FAQ: ${s.faqUrl}`] : []),
    ...(s.issuedOn ? [`    Issued: ${s.issuedOn}`] : []),
    ...(s.effectiveOn ? [`    Effective: ${s.effectiveOn}`] : []),
    "",
  );
}

part(13, "Money: bank, 1930 and the portals");
p(section(legal, "NCRP, 1930, police, and telecom reports are different routes"));
p("", section(legal, "Potential offence provisions"));

part(14, "Liability for a disputed transaction");
p(section(legal, "RBI unauthorised electronic transaction rules"));
p(
  "",
  "THE FOUR FACTS KAVACH SCREENS ON",
  "-".repeat(50),
  "",
  "  initiation          Did the caller initiate or approve the payment, or not, or is it unclear?",
  "  credentialsShared   Did sharing a credential cause or enable the loss?",
  "  suspectedBankFault  Does the caller suspect fraud, negligence or deficiency at the bank?",
  "  reportTiming        Time from the bank's transaction communication to notifying the bank:",
  "                      within 3 working days / 4 to 7 working days / after 7 working days /",
  "                      not reported / unknown.",
  "",
  "Ask these neutrally and never as blame. An unknown answer stays unknown.",
  "",
  "EXPLANATIONS KAVACH IS ALLOWED TO GIVE (each already tied to the circular)",
  "-".repeat(50),
  "",
);
for (const e of rbiExplanations) {
  p(`  - ${e.text}`, `      [${rbiCircular.id}, paragraph(s) ${e.paragraphs.join(", ")}]`, "");
}

part(15, "Escalating to the RBI Ombudsman");
p(section(legal, "RBI Integrated Ombudsman Scheme, 2026"));
p(
  "",
  "THE NUMBERS KAVACH COMPUTES WITH",
  "-".repeat(50),
  "",
  `  Scheme: ${ombScheme.title} [${ombScheme.id}], effective ${ombScheme.effectiveOn}`,
  `  Clauses: ${(ombScheme.provisions || []).join(", ")}`,
  `  Ordinary response period before the route opens: ${ombScheme.ordinaryResponseDays} days`,
  `  Ordinary filing window: ${ombScheme.filingWindowDays} days after the later of the response period expiring`,
  "  or the regulated entity's last communication about the grievance.",
  "  A longer response period applies only where an RBI, NPCI or card-network rule for that",
  "  complaint type verifiably says so.",
);

const legalParts = [
  ["Police, FIR and Zero FIR", "Police reporting and criminal procedure"],
  ["Which criminal law applies to which date", "Date-aware criminal-law routing"],
  ["Children and POCSO", "Children and POCSO"],
  ["Sexual offences, stalking and intimate imagery", "Sexual offences, harassment, stalking"],
  ["Domestic violence", "Domestic violence"],
  ["Workplace sexual harassment", "Workplace sexual harassment"],
  ["Healthcare and medico-legal care", "Healthcare, medico-legal care"],
  ["Evidence", "Electronic evidence and the case"],
  ["Privacy and what happens to the caller's data", "Privacy, data protection, and vendor boundaries"],
  ["Getting content taken down", "Intermediary grievances, intimate-image removal"],
  ["Support, legal aid and non-police routes", "Support, legal aid, and non-police routes"],
];
let n = 16;
for (const [title, heading] of legalParts) {
  part(n++, title);
  p(section(legal, heading));
}

part(n++, "Questions callers ask, and the answers Kavach already gives");
for (let i = 1; en.has(`faq.q${i}`); i++) {
  p(`Q: ${t(`faq.q${i}`)}`, `A: ${t(`faq.a${i}`)}`, "");
}

part(n++, "Case law: what may be said, and what must not be overstated");
p(section(legal, "Case-law index"));

part(n++, "Verification register: what expires and how often to recheck");
p(section(legal, "Time-sensitive verification register"));

part(n++, "Source governance");
p(section(legal, "Source governance"));

part(n++, "Call dispositions");
p(cfg.dispositions.classificationInstructions, "");
for (const d of cfg.dispositions.tags) p(`  ${d.tag}`, `      ${d.prompt}`, "");

part(n++, "Fields extracted after the call");
p(
  "Every one of these is a draft until the caller confirms the summary. Restricted values are never",
  "written into any of them.",
  "",
);
for (const f of cfg.extractedFields) p(`  ${f.field}`, `      ${f.prompt}`, "");

part(n++, "Processors the caller may be told about");
p(
  cfg.stack._comment,
  "",
  ...Object.entries(cfg.stack)
    .filter(([k, s]) => !k.startsWith("_") && s && s.provider)
    .map(([role, s]) => `  ${role}: ${s.provider} ${s.model || ""}`.trimEnd()),
  "",
  "Name a processor only if it is actually in the deployed call path. Do not describe a fallback",
  "provider as though it handled this call.",
);

part(n++, "Human transfer");
for (const tool of cfg.functionTools) {
  p(
    `  Tool: ${tool.name} — ${tool.purpose}`,
    `  Use: ${tool.prompt}`,
    `  Current state: ${tool.status}.`,
    "  If no transfer target is configured or the transfer fails, say so honestly and offer a safe",
    "  callback or the typed web flow. Never simulate a completed transfer.",
    "",
  );
}

p("", rule(), "END OF KNOWLEDGE BASE", rule());

const text = doc.join("\n").replace(/\n{4,}/g, "\n\n\n") + "\n";
const bytes = Buffer.byteLength(text, "utf8");
if (bytes > MAX_BYTES) throw new Error(`knowledge base is ${bytes} bytes; Vaani accepts at most ${MAX_BYTES}`);

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  // The generated-on line changes daily; compare everything else.
  const strip = (s) => s.replace(/^Generated by .* on \d{4}-\d{2}-\d{2}\./m, "");
  if (strip(current) !== strip(text)) {
    console.error("docs/vaani-knowledge-base.txt is stale. Run: node scripts/gen-vaani-kb.mjs");
    process.exit(1);
  }
  console.log("docs/vaani-knowledge-base.txt is up to date.");
} else {
  writeFileSync(OUT, text);
  console.log(
    `docs/vaani-knowledge-base.txt  ${bytes} bytes (${((bytes / MAX_BYTES) * 100).toFixed(1)}% of the 1 MB limit), ` +
      `${text.split("\n").length} lines, ${tracks.length} tracks, ${categories.length} categories, ${languages.length} languages`,
  );
}
