/**
 * Machine-translate the English dictionary once, at build time, and commit it.
 *
 * The alternative — translating in the browser through an embedded widget or a
 * per-view API call — is wrong for this product specifically. Kavach has to work
 * on a 2G connection and after the connection drops, and a translation service
 * in the render path breaks both. It also puts legal deadlines through a
 * translator nobody can inspect, which is not something to be casual about when
 * getting "three working days" wrong costs somebody their money.
 *
 * So: translate offline, write real files, and let a native speaker correct
 * them. The loader is already code-split, so a citizen still downloads exactly
 * one language.
 *
 * Existing human translations always win. This only fills gaps.
 *
 *   node scripts/translate-dict.mjs            # every language, missing keys only
 *   node scripts/translate-dict.mjs ta te      # just these
 *   node scripts/translate-dict.mjs --dry ta   # show what would be sent
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DICT = resolve(ROOT, "src/lib/i18n/dict");

// ── env ─────────────────────────────────────────────────────────────────────
for (const file of [".env.local", ".env"]) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5";
if (!KEY) {
  console.error("No OPENAI_API_KEY. Nothing to do.");
  process.exit(1);
}

// ── the languages we claim to support ───────────────────────────────────────
const LANGUAGES = Object.fromEntries(
  [...readFileSync(resolve(ROOT, "src/lib/i18n/languages.ts"), "utf8")
    .matchAll(/code:\s*"([a-z]{2,3})",\s*endonym:\s*"([^"]+)",\s*english:\s*"([^"]+)"/g)]
    .map((m) => [m[1], { endonym: m[2], english: m[3] }]),
);

// ── parse a dict file into ordered pairs ────────────────────────────────────
const LINE = /^\s*"([A-Za-z0-9._]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/;

function parseDict(path) {
  if (!existsSync(path)) return new Map();
  const out = new Map();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(LINE);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

const en = parseDict(resolve(DICT, "en.ts"));
if (!en.size) throw new Error("Could not read en.ts");

// ── the prompt ──────────────────────────────────────────────────────────────
const SYSTEM = (english, endonym) => `You are translating the interface of Kavach, a tool that helps victims of cybercrime in India file complaints and meet legal deadlines.

Translate each value into ${english} (${endonym}), in its proper script.

Who reads this: someone who has just lost money to fraud, often on a cheap phone, often not confident in English. Plain, direct, respectful. Not formal officialese, not chatty.

Rules, in order of importance:
1. Leave these EXACTLY as they are, in Latin script: FIR, UPI, UTR, OTP, KYC, PAN, IFSC, NCRP, MRM, RBI, I4C, GIGW, SMS, PDF, URL, Aadhaar, Chakshu, Kavach, cybercrime.gov.in, mrm-ncrp.mha.gov.in, sancharsaathi.gov.in, cms.rbi.org.in, tafcop.sancharsaathi.gov.in, ceir.sancharsaathi.gov.in, and any number, digit, amount, ₹ figure, phone number like 1930 or 15100, statute name, or section number.
2. Keep the meaning of every legal fact exact. "Three working days" and "ten calendar days" are not interchangeable, and a wrong number here costs somebody their money. If you are unsure, translate literally rather than idiomatically.
3. Keep it close to the English in length. These are buttons, labels and short paragraphs in a fixed layout.
4. Preserve leading and trailing punctuation, em dashes, and the sentence count.
5. Do not add, remove, explain or soften anything. Do not translate a proper noun into a description of it.

Return a JSON object mapping each input key to its translated string. Every key you are given must appear in the output, exactly once.`;

async function translate(batch, english, endonym) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM(english, endonym) },
        { role: "user", content: JSON.stringify(Object.fromEntries(batch), null, 1) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return JSON.parse(body.choices?.[0]?.message?.content ?? "{}");
}

// ── write a dict file ───────────────────────────────────────────────────────
function serialise(code, pairs) {
  const { english } = LANGUAGES[code];
  const body = [...pairs].map(([k, v]) => `  "${k}": "${v}",`).join("\n");
  return `import type { DictKey } from "./en";

/**
 * ${english}.
 *
 * Machine-translated from en.ts and not yet reviewed by a native speaker. Any
 * key missing here falls through to English rather than rendering empty, and
 * the language picker shows the real coverage rather than implying completeness.
 *
 * Regenerate with: node scripts/translate-dict.mjs ${code}
 */
export const ${code.replace(/[^a-z]/g, "")}: Partial<Record<DictKey, string>> = {
${body}
};
`;
}

// ── run ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args.filter((a) => !a.startsWith("--"));
const targets = (only.length ? only : Object.keys(LANGUAGES)).filter((c) => c !== "en");

const BATCH = 40;

for (const code of targets) {
  const meta = LANGUAGES[code];
  if (!meta) {
    console.error(`  ${code}: not in languages.ts, skipping`);
    continue;
  }
  const path = resolve(DICT, `${code}.ts`);
  const existing = parseDict(path);
  const missing = [...en].filter(([k]) => !existing.has(k));

  if (!missing.length) {
    console.log(`${code} (${meta.english}): complete, ${existing.size} keys`);
    continue;
  }
  console.log(`${code} (${meta.english}): ${existing.size} kept, ${missing.length} to translate`);
  if (dry) continue;

  const done = new Map(existing);
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    let got;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        got = await translate(batch, meta.english, meta.endonym);
        break;
      } catch (e) {
        console.error(`    batch ${i / BATCH + 1} attempt ${attempt}: ${e.message}`);
        if (attempt === 3) got = {};
        else await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    for (const [k] of batch) {
      const v = got?.[k];
      // A missing or empty translation stays missing, so it falls through to
      // English instead of rendering a blank label.
      if (typeof v === "string" && v.trim()) done.set(k, v.replace(/"/g, '\\"').replace(/\n/g, "\\n"));
    }
    process.stdout.write(`    ${Math.min(i + BATCH, missing.length)}/${missing.length}\r`);
  }

  // Re-order to match en.ts so the files diff cleanly against each other.
  const ordered = new Map([...en].filter(([k]) => done.has(k)).map(([k]) => [k, done.get(k)]));
  writeFileSync(path, serialise(code, ordered));
  console.log(`    wrote ${ordered.size}/${en.size} keys → ${code}.ts`);
}
