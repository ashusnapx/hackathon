/**
 * Ask every legal source we cite whether it is still there.
 *
 * A dead link on a page telling somebody their bank has ten days to answer is
 * worse than no link: it is the one thing they would check before believing us.
 * Two of ours had rotted without anyone noticing, so this is a command rather
 * than a memory — run it before a release.
 *
 *   node scripts/check-sources.mjs
 *
 * Not a unit test on purpose: it depends on RBI's website being up, and a test
 * suite that fails because somebody else's server is slow teaches people to
 * ignore failures.
 */
import { readFileSync } from "node:fs";

const files = ["src/lib/legal/rbi.ts", "src/lib/legal/ombudsman.ts", "src/lib/case/tracks.ts"];
const urls = new Set();
for (const file of files) {
  for (const [, url] of readFileSync(file, "utf8").matchAll(/"(https:\/\/[^"]+)"/g)) urls.add(url);
}

let bad = 0;
for (const url of [...urls].sort()) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Kavach source check)" },
      signal: AbortSignal.timeout(30_000),
    });
    const type = res.headers.get("content-type") ?? "";
    // A PDF path that answers with HTML is a dead link wearing a suit: RBI's
    // error page returns 200, so status alone would have missed both of ours.
    const lying = url.toLowerCase().endsWith(".pdf") && !type.includes("pdf");
    const ok = res.ok && !lying;
    if (!ok) bad += 1;
    console.log(`${ok ? "ok  " : "DEAD"} ${res.status} ${lying ? "(not a PDF) " : ""}${url}`);
  } catch (err) {
    bad += 1;
    console.log(`DEAD --- ${url} — ${err instanceof Error ? err.message : err}`);
  }
}
console.log(bad ? `\n${bad} source(s) need attention.` : `\nAll ${urls.size} sources answered.`);
process.exit(bad ? 1 : 0);
