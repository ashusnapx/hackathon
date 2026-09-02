/**
 * Renders the social preview card to public/og-image.png.
 *
 * Why a checked-in PNG rather than Next's `ImageResponse`:
 *
 *   · Every platform that matters refuses SVG — Facebook, WhatsApp, X,
 *     LinkedIn, Slack, iMessage, Telegram, Discord. That was the bug this
 *     script exists to fix, and it is worth not reintroducing by being clever.
 *   · WhatsApp in particular fetches the image on a short timeout and gives up
 *     silently. A static file served from the CDN edge always wins that race;
 *     a route that has to boot a runtime and rasterise does not.
 *   · Satori, which backs ImageResponse, supports a subset of CSS. The card
 *     below uses the real site fonts at real sizes, and I would rather render
 *     it in the same engine the site is designed against.
 *
 * Run manually after changing the card, then commit the PNG:
 *
 *     npx playwright install chromium     # once, if needed
 *     node scripts/og-image.mjs
 *
 * Set CHROME_EXE to use a Chrome you already have instead.
 */

import { writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const OUT = path.resolve("public/og-image.png");
const HTML = path.resolve("public/.og-card.html");

/* 1200x630 is the size every platform crops from. Rendering at twice that and
   downsampling is the difference between clean Garamond and fringed Garamond. */
const W = 1200;
const H = 630;

const SITE = "cybercrime-assistant.vercel.app";

const card = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400&family=Figtree:wght@500;600&display=block" rel="stylesheet">
<style>
  :root {
    --paper: #ffffeb;
    --ink: #1a1a1a;
    --flare: #ff6c4c;
    --rule: rgba(26, 26, 26, 0.13);
    --ink-2: rgba(26, 26, 26, 0.68);
    --ink-3: rgba(26, 26, 26, 0.6);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${W}px; height: ${H}px;
    background: var(--paper);
    color: var(--ink);
    font-family: Figtree, sans-serif;
    font-weight: 500;
    position: relative;
    overflow: hidden;
  }
  /* The same ruled-paper grid the hero carries, at the same 2.4rem pitch. */
  .ledger {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(var(--rule) 1px, transparent 1px),
      linear-gradient(90deg, var(--rule) 1px, transparent 1px);
    background-size: 100% 38px, 38px 100%;
    opacity: 0.55;
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 20%, transparent 78%);
  }
  .frame {
    position: relative;
    height: 100%;
    padding: 56px 64px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .mark { display: flex; align-items: center; gap: 13px; }
  .mark span {
    font-family: "EB Garamond", serif;
    font-size: 38px; letter-spacing: -0.02em; line-height: 1;
  }
  .chip {
    display: inline-flex; align-items: center; gap: 11px;
    border: 1px solid rgba(26, 26, 26, 0.25);
    background: #ffeae3;
    border-radius: 10px;
    padding: 11px 17px;
    font-size: 20px;
  }
  .chip b { font-weight: 600; letter-spacing: -0.01em; }
  .dot { width: 10px; height: 10px; border-radius: 999px; background: var(--flare); }

  h1 {
    font-family: "EB Garamond", serif;
    font-weight: 400;
    font-size: 84px;
    letter-spacing: -0.03em;
    line-height: 1.0;
    max-width: 20ch;
  }
  h1 i { font-style: italic; }

  .bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
  .facts { display: flex; gap: 34px; }
  .fact .n {
    font-family: "EB Garamond", serif;
    font-size: 46px; letter-spacing: -0.03em; line-height: 1;
    font-variant-numeric: lining-nums tabular-nums;
  }
  .fact .l { margin-top: 8px; font-size: 17px; color: var(--ink-3); }
  .url {
    font-size: 19px; color: var(--ink-3);
    text-align: right; line-height: 1.5;
  }
  .url b { display: block; color: var(--ink-2); font-weight: 500; }
</style>
</head>
<body>
  <div class="ledger"></div>
  <div class="frame">
    <div class="top">
      <div class="mark">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <path d="M16 2.5 4.5 7v10.2c0 6.6 4.7 10.9 11.5 12.3 6.8-1.4 11.5-5.7 11.5-12.3V7L16 2.5Z"
                stroke="#1a1a1a" stroke-width="1.7" stroke-linejoin="round"/>
          <path d="M16 8v11M11 13.5h10" stroke="#ff6c4c" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span>Kavach</span>
      </div>
      <div class="chip"><i class="dot"></i><span>Money just left your account?</span>&nbsp;<b>1930</b></div>
    </div>

    <h1>You have sixty minutes. <i>We know exactly what to do with them.</i></h1>

    <div class="bottom">
      <div class="facts">
        <div class="fact"><div class="n">23</div><div class="l">languages</div></div>
        <div class="fact"><div class="n">10</div><div class="l">legal deadlines</div></div>
        <div class="fact"><div class="n">60s</div><div class="l">to a filed complaint</div></div>
      </div>
      <div class="url"><b>${SITE}</b>Independent tool. Not a government website.</div>
    </div>
  </div>
</body>
</html>`;

function chromium() {
  try {
    return require("playwright").chromium;
  } catch {
    try {
      return require("playwright-core").chromium;
    } catch {
      console.error(
        "This script needs Playwright:\n" +
          "  npm i -D playwright && npx playwright install chromium\n" +
          "or set CHROME_EXE to an existing Chrome binary and install playwright-core.",
      );
      process.exit(1);
    }
  }
}

const browser = await chromium().launch(
  process.env.CHROME_EXE ? { executablePath: process.env.CHROME_EXE } : {},
);
writeFileSync(HTML, card);

const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});
await page.goto("file://" + HTML);
// `display: block` on the font link means text stays invisible rather than
// falling back, so waiting on the font set is what stops a Times New Roman card.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: OUT });
await browser.close();

// Down to exactly 1200x630. Rendering at 2x and resampling is what keeps the
// Garamond hairlines from breaking up.
try {
  execFileSync("sips", ["-z", String(H), String(W), OUT], { stdio: "ignore" });
} catch {
  console.warn("sips unavailable — the PNG is 2x size, which platforms still accept.");
}

if (existsSync(HTML)) execFileSync("rm", [HTML]);

const { size } = await import("node:fs").then((fs) => fs.statSync(OUT));
console.log(`public/og-image.png written — ${W}x${H}, ${(size / 1024).toFixed(0)} KB`);
