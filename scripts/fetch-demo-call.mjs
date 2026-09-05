/**
 * Bake a real Vaani call into the repo, for the landing page to show.
 *
 * The landing page must render on a cold cache, on 2G, with no API key and no
 * network call to a third party — so the call is fetched once, here, and
 * committed. It is a real conversation, not a mock-up: the transcript, the
 * recording and the extracted fields all come back from the provider exactly as
 * a caller's would.
 *
 *   node scripts/fetch-demo-call.mjs <call-id> [--drop-leading N]
 *
 * --drop-leading exists for one honest reason: a call recorded before a fix can
 * open with a turn that no longer happens. Whatever is dropped is recorded in
 * the JSON, so the page can never quietly show an edited conversation.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.vaanivoice.ai/api";

for (const file of [".env.local", ".env"]) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const callId = process.argv[2];
if (!callId) throw new Error("usage: node scripts/fetch-demo-call.mjs <call-id>");
const key = process.env.VAANI_API_KEY?.trim();
if (!key) throw new Error("VAANI_API_KEY is not set");

const get = async (path) => {
  const res = await fetch(`${API}${path}`, { headers: { "X-API-Key": key } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res;
};

/** Same cleanup the app applies before a caller reads their own words back. */
function turnsFrom(transcript) {
  const cleaned = transcript
    .replace(/<\/?(?:speed|break|prosody|emphasis|say-as|phoneme|sub|voice|lang|p|s)\b[^>]*>/gi, "")
    .replace(/\binterrupted\s*:\s*(true|false)/gi, "");
  const chunks = cleaned.split(/\b(AGENT|USER|ASSISTANT|VICTIM)\s*:\s*/gi);
  const turns = [];
  for (let i = 1; i < chunks.length; i += 2) {
    const agent = /agent|assistant/i.test(chunks[i]);
    const raw = chunks[i + 1] || "";
    const at = (raw.match(/\[\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*\]/) || [])[1];
    const text = raw
      .replace(/\[\s*\d{1,2}:\d{2}(:\d{2})?\s*\]/g, " ")
      .replace(/\[\s*\d{4}-\d{2}-\d{2}[^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) turns.push({ agent, text, at });
  }
  return turns;
}

const details = await (await get(`/call_details/${encodeURIComponent(callId)}`)).json();
const transcript = details.transcription || (await (await get(`/transcript/${encodeURIComponent(callId)}`)).json()).transcript || "";
const allTurns = turnsFrom(transcript);
const dropIndex = process.argv.indexOf("--drop-leading");
const dropLeading = dropIndex === -1 ? 0 : Number(process.argv[dropIndex + 1] || 0);
const turns = allTurns.slice(dropLeading);

const p50 = details.percentile_statistics?.percentiles?.all_turns || {};
const round = (value) => (typeof value === "number" ? Math.round(value) : undefined);

// Only fields the agent actually filled. A null is not a demo.
const extracted = Object.fromEntries(
  Object.entries(details.entity || {}).filter(([, v]) => v !== null && v !== undefined && v !== ""),
);

const payload = {
  callId,
  fetchedAt: new Date().toISOString().slice(0, 10),
  turns,
  omittedLeadingTurns: dropLeading
    ? { count: dropLeading, text: allTurns.slice(0, dropLeading).map((turn) => turn.text) }
    : undefined,
  extracted,
  extractedCount: Object.keys(details.entity || {}).length,
  filledCount: Object.keys(extracted).length,
  summary: typeof details.summary === "string" ? details.summary.trim() : undefined,
  disposition: details.call_eval_tag?.call_disposition,
  quality: details.conversation_eval,
  latencyMsP50: {
    speechToText: round(p50.stt_latency_ms?.p50),
    modelFirstToken: round(p50.llm_ttft_ms?.p50),
    speechOut: round(p50.tts_ttfb_ms?.p50),
    endToEnd: round(p50.e2e_latency_ms?.p50),
  },
  audio: "/demo/vaani-call.ogg",
};

mkdirSync(resolve(ROOT, "src/lib/demo"), { recursive: true });
mkdirSync(resolve(ROOT, "public/demo"), { recursive: true });
writeFileSync(resolve(ROOT, "src/lib/demo/call.json"), `${JSON.stringify(payload, null, 2)}\n`);

const audio = await get(`/stream/${encodeURIComponent(callId)}`);
const bytes = Buffer.from(await audio.arrayBuffer());
writeFileSync(resolve(ROOT, "public/demo/vaani-call.ogg"), bytes);

console.log("\nRe-encode before committing, or the landing page ships 3.6 MB to a 2G phone:");
console.log("  ffmpeg -y -i public/demo/vaani-call.ogg -ac 1 -c:a libopus -b:a 24k public/demo/tmp.ogg \\");
console.log("    && mv public/demo/tmp.ogg public/demo/vaani-call.ogg");
console.log(
  `${callId}: ${turns.length} turns, ${payload.filledCount}/${payload.extractedCount} fields filled, `
  + `${(bytes.length / 1024 / 1024).toFixed(1)} MB of audio, ${payload.latencyMsP50.endToEnd}ms median reply`,
);
