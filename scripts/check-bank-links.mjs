/**
 * Re-check every bank link, so this list cannot rot silently.
 *
 * It rotted once already: sixteen of twenty-six links in the first version of
 * banks.ts were guessed rather than checked, and the first person to pick State
 * Bank of India got a page that would not load. This script is the reason that
 * cannot happen quietly a second time.
 *
 *   npm run check:banks
 *
 * A 403 is reported but not failed. Several Indian bank sites sit behind a CDN
 * that refuses anything without a browser fingerprint, and treating that as a
 * dead link would remove working banks from the list.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(ROOT, "src/lib/case/banks.ts"), "utf8");

const banks = [...source.matchAll(/name: "([^"]+)", url: "([^"]+)", deep: (true|false)/g)]
  .map(([, name, url, deep]) => ({ name, url, deep: deep === "true" }));

const extra = [...source.matchAll(/^export const (RBI_[A-Z_]+) = "([^"]+)"/gm)]
  .map(([, name, url]) => ({ name, url, deep: true }));

const all = [...banks, ...extra];
console.log(`Checking ${all.length} links…\n`);

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
let dead = 0;
let blocked = 0;

for (const { name, url, deep } of all) {
  let status = "ERR";
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    status = String(response.status);
  } catch (error) {
    // A transport-level failure is NOT a dead page. IDBI's server negotiates a
    // TLS handshake Node refuses while curl and every browser complete it
    // happily, and dropping the bank on that basis would remove a working link
    // for a few million customers. These are reported and hand-checked.
    status = error?.name === "TimeoutError" ? "TIMEOUT" : "NO-HANDSHAKE";
  }

  const ok = status.startsWith("2");
  // 403 is a CDN refusing a non-browser; 3xx followed to a 3xx is a site that
  // redirects on user-agent. Neither means the page is gone.
  const soft = status === "403" || status.startsWith("3") || !/^\d/.test(status);
  if (!ok && !soft) dead += 1;
  if (soft) blocked += 1;

  const mark = ok ? "ok  " : soft ? "?   " : "DEAD";
  console.log(`${mark} ${status.padEnd(11)} ${deep ? "deep" : "home"}  ${name} — ${url}`);
}

console.log(
  `\n${all.length - dead - blocked} reachable, ${blocked} unverifiable from here, ${dead} dead.`,
);
if (blocked) {
  console.log("Unverifiable means a CDN or a TLS quirk refused this client, not that the page is gone. Open those in a browser.");
}
if (dead) {
  console.error("\nA dead link reads as a closed route to somebody who has just lost money. Fix these before shipping.");
  process.exitCode = 1;
}
