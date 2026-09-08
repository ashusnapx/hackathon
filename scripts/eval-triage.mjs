/**
 * Score the classifier against the golden set.
 *
 *   npm run eval:triage              # against the live model
 *   npm run eval:triage -- --rules   # against the rules fallback only
 *
 * Not a unit test, for the same reason `check-sources.mjs` is not: it spends
 * real model calls and depends on a provider being up. A test suite that fails
 * because somebody else's API is slow teaches people to ignore failures.
 *
 * Run it before shipping a change to a prompt, a model or the taxonomy. The
 * number to watch is balanced accuracy, and the number that must not move is
 * `confidently wrong` — see `src/lib/ai/eval/score.ts` for why.
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const rulesOnly = args.includes("--rules");

const runner = `
import { GOLDEN } from "./src/lib/ai/eval/dataset.ts";
import { score, format, meetsBar } from "./src/lib/ai/eval/score.ts";
import { ruleTriage } from "./src/lib/ai/fallback.ts";
import { aiConfigured, jsonCall } from "./src/lib/ai/provider.ts";
import { TRIAGE_SYSTEM, TRIAGE_SCHEMA } from "./src/lib/ai/prompts.ts";

const rulesOnly = ${rulesOnly};
const useModel = !rulesOnly && aiConfigured;

if (!useModel) {
  console.log(rulesOnly
    ? "\\n  Rules fallback only (--rules).\\n"
    : "\\n  No AI key configured — scoring the rules fallback instead.\\n");
}

(async () => {
// Gemini's free tier is 15 requests per minute. Four seconds apart keeps the
// whole run inside it with room for the retry.
const GAP_MS = Number(process.env.EVAL_GAP_MS || 4200);
const RETRY_WAIT_MS = Number(process.env.EVAL_RETRY_MS || 20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ask = (text) => jsonCall({
  system: TRIAGE_SYSTEM,
  user: text,
  schema: TRIAGE_SCHEMA,
  schemaName: "triage",
  // A classifier that answers differently on the same input cannot be
  // measured, so the eval pins temperature even where the app does not.
  temperature: 0,
});

let empty = 0;
const predictions = [];
for (const c of GOLDEN) {
  if (!useModel) {
    const t = ruleTriage(c.text);
    predictions.push({ id: c.id, category: t.categoryId, subcategory: t.subcategoryId, confidence: t.confidence });
    continue;
  }
  /*
   * Paced, and retried on an empty answer.
   *
   * The first run of this against the live model scored four cases as "(none)"
   * and read as a 20% model failure. It was not: the Gemini free tier allows
   * fifteen requests a minute and the harness was firing twenty back to back,
   * so a third of the run was measuring a 429 rather than a classifier.
   *
   * An evaluation that silently scores rate limiting as inaccuracy is worse
   * than no evaluation — it would have had somebody tuning a prompt against
   * quota errors. So the runner spaces its calls, retries an empty answer once
   * after a longer wait, and reports separately how many answers never arrived,
   * which is an operational number rather than an accuracy one.
   */
  let got = await ask(c.text);
  if (!got) {
    await sleep(RETRY_WAIT_MS);
    got = await ask(c.text);
  }
  if (!got) empty += 1;

  predictions.push({
    id: c.id,
    category: got?.categoryId ?? "(none)",
    subcategory: got?.subcategoryId,
    confidence: Number(got?.confidence ?? 0),
  });
  process.stdout.write(got ? "." : "!");
  await sleep(GAP_MS);
}
process.stdout.write("\\n");

const report = score(predictions);
console.log(format(report));

if (empty) {
  console.log([
    "",
    "  " + empty + " of " + GOLDEN.length + " answers never arrived, after a retry.",
    "  That is a quota or availability problem, not an accuracy one - but every",
    "  one of them falls through to the rules classifier in production.",
  ].join(String.fromCharCode(10)));
}

const bar = meetsBar(report);
if (!bar.ok) {
  console.log("\\n  BELOW BAR:\\n" + bar.failures.map((f) => "    - " + f).join("\\n") + "\\n");
  process.exit(1);
}
console.log("\\n  Meets the bar.\\n");
})();
`;

const result = spawnSync("npx", ["tsx", "-e", runner], { stdio: "inherit", shell: false });
process.exit(result.status ?? 1);
