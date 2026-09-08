"use client";

import { useEffect, useRef, useState } from "react";

import call from "@/lib/demo/call.json";
import { DEMO_CASE_PATH } from "@/lib/demo/id";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

/**
 * Seven posters for one product, dealt on a countdown.
 *
 * ── Why posters and not a picture of a person ───────────────────────────────
 *
 * The obvious hero image here is a photograph or a drawing of somebody looking
 * worried at a phone. It is also the one image that says nothing: every
 * fraud-help page already has it, and it is a picture of the problem rather
 * than of the answer. What a first-time visitor needs is not sympathy — it is
 * to learn, in about half a minute, that this thing takes them from "I have
 * been cheated" to a filed, dated, tracked case, and to see each part of that
 * claim demonstrated rather than asserted.
 *
 * So the slot is a deck. Each poster is one whole argument — a label, a line of
 * display type with the turn falling into italic, and the actual thing working
 * underneath it — and between them they cover everything the product does:
 * voice intake in every scheduled language, extraction the caller confirms, ten
 * dated clocks carrying their sources, the four drafts, the hand-off where the
 * citizen files, the vault and the case pack, and the message checker that runs
 * before any money has moved.
 *
 * Three of the seven take a coloured ground — the deep green, the dawn, the ink
 * — from the same panel classes the sections below use. That is what makes them
 * read as posters rather than as one panel swapping its contents, and because
 * those classes redefine every token rather than setting colours, the type,
 * rules and status chips stay correct on all four grounds without a single
 * variant written by hand.
 *
 * ── The countdown ───────────────────────────────────────────────────────────
 *
 * A deck that changes on its own without saying so reads as a glitch — the
 * reader looks up and the thing they were halfway through has gone. So the
 * timer is explicit: a ring that empties and a digit that counts down, which
 * says both "there is more" and "you have four seconds". It freezes under the
 * pointer and while focus is inside, and it is not rendered at all when the
 * reader has asked for reduced motion, where the rail is simply seven buttons.
 *
 * ── What the content may not do ─────────────────────────────────────────────
 *
 * Poster 02 writes no numbers. The amount, the method and the category come out
 * of `src/lib/demo/call.json` — the extraction of the real recorded call this
 * repo ships, the one the voice section plays back in full — so the poster
 * cannot quietly become a mock-up. Poster 05 is the citizen filing, not us.
 * Poster 07 never calls anything safe, because the checker cannot know that; it
 * shows what is wrong with what was pasted, and tags its example as an example.
 */

const EXTRACTED = call.extracted as Record<string, unknown>;

/** How long each poster holds, in ms. Long enough to read a headline and rows. */
const DWELL = 6000;

/** The caller's own words. Trimmed to the clause, not rewritten. */
const QUOTE = "…a transaction day before yesterday, which got failed.";

interface Poster {
  label: DictKey;
  head: DictKey;
  headEm: DictKey;
  foot: DictKey;
  /** A panel ground from globals.css, or none for the default raised white. */
  ground?: string;
  Body: () => React.ReactElement;
}

/* ══ The deck ═══════════════════════════════════════════════════════════════ */

const DECK: Poster[] = [
  { label: "hero.deck.p1.label", head: "hero.deck.p1.head", headEm: "hero.deck.p1.headEm", foot: "hero.deck.p1.foot", Body: Speaking },
  { label: "hero.deck.p2.label", head: "hero.deck.p2.head", headEm: "hero.deck.p2.headEm", foot: "hero.deck.p2.foot", Body: Facts },
  { label: "hero.deck.p3.label", head: "hero.deck.p3.head", headEm: "hero.deck.p3.headEm", foot: "hero.deck.p3.foot", ground: "on-deep", Body: Clocks },
  { label: "hero.deck.p4.label", head: "hero.deck.p4.head", headEm: "hero.deck.p4.headEm", foot: "hero.deck.p4.foot", Body: Drafts },
  { label: "hero.deck.p5.label", head: "hero.deck.p5.head", headEm: "hero.deck.p5.headEm", foot: "hero.deck.p5.foot", ground: "on-dawn", Body: Filing },
  { label: "hero.deck.p6.label", head: "hero.deck.p6.head", headEm: "hero.deck.p6.headEm", foot: "hero.deck.p6.foot", Body: Vault },
  { label: "hero.deck.p7.label", head: "hero.deck.p7.head", headEm: "hero.deck.p7.headEm", foot: "hero.deck.p7.foot", ground: "on-dark", Body: Checker },
];

export function HeroCall() {
  const t = useT();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  // Rotation stays off until the client says motion is welcome, so the server
  // and the first client render agree and nothing moves before hydration.
  const [rotates, setRotates] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setRotates(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /** Choosing a poster by hand ends the rotation for good. */
  const choose = (i: number) => {
    setActive(i);
    setRotates(false);
  };

  // Left and right walk the rail and take focus with them, as a tablist must.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + DECK.length) % DECK.length;
    choose(next);
    tabs.current[next]?.focus();
  };

  const poster = DECK[active];

  return (
    <div
      className="relative rise"
      style={{ animationDelay: "220ms" }}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      {/* The deck's title, overlapping the corner rather than sitting above it,
          which is what stops the two reading as separate objects. */}
      <p className="absolute -top-3 start-5 z-10 inline-flex items-center gap-2 rounded-ctl border border-rule bg-paper px-3 py-1.5 text-xs font-medium text-ink-2 shadow-[0_2px_10px_-6px_rgba(26,26,26,0.4)]">
        <span className="h-1.5 w-1.5 rounded-full bg-urgent shrink-0" aria-hidden />
        {t("hero.deck.title")}
      </p>

      <div
        className={cn(
          "rounded-card border border-rule overflow-hidden transition-colors duration-500",
          "shadow-[0_28px_60px_-40px_rgba(26,26,26,0.55)]",
          // The panel classes paint their own ground; only the default poster
          // needs a background of its own.
          poster.ground ?? "bg-raised",
        )}
      >
        {/* ── Rail and countdown ────────────────────────────────────────────
            Seven segments doubling as the tablist, and beside them a ring that
            empties. The rail says where you are in the deck; the ring says how
            long before it moves, which is the difference between a deck that is
            advancing and one that appears to be glitching. */}
        <div className="flex items-center gap-4 px-5 pt-4 sm:px-6">
          <div role="tablist" aria-label={t("hero.deck.title")} onKeyDown={onKeyDown} className="flex flex-1 gap-1.5">
            {DECK.map((p, i) => (
              <button
                key={p.label}
                ref={(el) => { tabs.current[i] = el; }}
                role="tab"
                id={`hero-poster-${i}`}
                aria-controls="hero-poster-panel"
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                onClick={() => choose(i)}
                className="group flex flex-1 min-h-11 items-center rounded-ctl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <span className="sr-only">{`${t("hero.deck.step")} ${i + 1} — ${t(p.label)}`}</span>
                <span
                  className={cn(
                    "block w-full h-[3px] rounded-full transition-colors",
                    i === active ? "bg-urgent" : i < active ? "bg-ink/30" : "bg-rule group-hover:bg-ink/25",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          {rotates && (
            <Countdown
              key={active}
              duration={DWELL}
              paused={held}
              label={t("hero.deck.next")}
              onDone={() => setActive((i) => (i + 1) % DECK.length)}
            />
          )}
        </div>

        {/* ── The poster ────────────────────────────────────────────────────
            A fixed floor, so seven bodies of different lengths do not make the
            card breathe in and out as the deck advances. */}
        <div
          role="tabpanel"
          id="hero-poster-panel"
          aria-labelledby={`hero-poster-${active}`}
          tabIndex={-1}
          className="px-5 pt-4 pb-6 sm:px-6"
        >
          {/* Keyed on the poster, so each one arrives rather than crossfading
              into the shape of the last. */}
          <div key={active} className="frame-in flex min-h-[19rem] flex-col">
            <p className="label">{t(poster.label)}</p>

            <h2 className="mt-3 font-display text-[1.75rem] sm:text-[2rem] leading-[1.05] tracking-[-0.03em] font-normal">
              {t(poster.head)}{" "}
              <span className="quiet-em">{t(poster.headEm)}</span>
            </h2>

            {/* Pushed to the foot of the poster, so the type stays at the top
                on every one of the seven regardless of how many rows follow. */}
            <div className="mt-6 flex-1 flex flex-col justify-end">
              <poster.Body />
            </div>
          </div>
        </div>

        {/* ── The caption ───────────────────────────────────────────────────
            The small print under the poster, and on the last one the way into a
            finished case that needs no account. */}
        <div className="border-t border-rule bg-sunk px-5 py-4 sm:px-6 min-h-[5.5rem] flex items-center">
          <p key={active} className="frame-in text-[0.8125rem] leading-[1.5] text-ink-2">
            {t(poster.foot)}
            {active === DECK.length - 1 && (
              <>
                {" "}
                <a
                  href={DEMO_CASE_PATH}
                  className="font-medium text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-ink whitespace-nowrap"
                >
                  {t("hero.deck.seeCase")} →
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══ The countdown ══════════════════════════════════════════════════════════ */

const R = 9;
const C = 2 * Math.PI * R;

/**
 * A ring that empties and a digit that counts down.
 *
 * The ring is written straight to the DOM from the animation frame and never
 * through state, so sixty frames a second cost no renders at all; only the
 * whole-second digit goes through React, once a second. Elapsed time lives in a
 * ref, so pausing does not restart the sweep — the parent remounts this on every
 * poster change, which is what resets it.
 */
function Countdown({
  duration, paused, label, onDone,
}: { duration: number; paused: boolean; label: string; onDone: () => void }) {
  const [secs, setSecs] = useState(Math.ceil(duration / 1000));
  const ring = useRef<SVGCircleElement>(null);
  const elapsed = useRef(0);
  const pausedRef = useRef(paused);
  const doneRef = useRef(onDone);

  // Mirrored in an effect rather than during render: the frame loop reads these
  // every frame but must not restart when either changes, and writing a ref
  // while rendering is what breaks that under concurrent rendering.
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let fired = false;

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) elapsed.current = Math.min(duration, elapsed.current + dt);

      const p = elapsed.current / duration;
      ring.current?.style.setProperty("stroke-dashoffset", String(C * p));
      setSecs((prev) => {
        const next = Math.max(1, Math.ceil((duration - elapsed.current) / 1000));
        return prev === next ? prev : next;
      });

      if (elapsed.current >= duration) {
        if (!fired) { fired = true; doneRef.current(); }
        return;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <span className="relative shrink-0 grid h-7 w-7 place-items-center" title={`${label} ${secs}s`}>
      <svg width="26" height="26" viewBox="0 0 26 26" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="13" cy="13" r={R} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rule" />
        <circle
          ref={ring}
          cx="13" cy="13" r={R}
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className="text-[color:var(--urgent)]"
          strokeDasharray={C}
        />
      </svg>
      <span className="num relative text-[0.625rem] font-bold text-ink-2 tabular-nums">{secs}</span>
      <span className="sr-only">{`${label} ${secs}`}</span>
    </span>
  );
}

/* ══ 01 · You speak ═════════════════════════════════════════════════════════ */

/**
 * The utterance, as loudness per slice of time. Hand-set rather than random so
 * the shape is a plausible sentence — two loud runs with a breath between them
 * — and so it is byte-identical on the server and the client. `Math.random()`
 * here is a hydration mismatch.
 */
const WAVE = [
  0.18, 0.34, 0.62, 0.9, 0.72, 0.48, 0.26, 0.14, 0.3, 0.55,
  0.82, 1, 0.76, 0.5, 0.28, 0.16, 0.12, 0.24, 0.44, 0.7,
  0.58, 0.36, 0.2, 0.42, 0.66, 0.86, 0.6, 0.32, 0.18, 0.24,
];

/** Rows in the matrix. Odd, so there is a centre line to be loud about. */
const ROWS = 7;
const MID = (ROWS - 1) / 2;

/**
 * How lit a dot is: full on the centre line, fading outward, dark past the edge
 * of the amplitude. A little light is left in an unlit dot rather than none,
 * because the grid has to stay visible when the room is silent — an empty
 * rectangle does not say "listening", it says "broken".
 */
function litness(row: number, amp: number): number {
  const d = Math.abs(row - MID) / MID;
  if (d > amp) return 0.08;
  return 1 - d * 0.34;
}

/** What the level travels up to. Same curve, more of it. */
const peak = (a: number) => Math.min(1, a * 1.5 + 0.12);

function Speaking() {
  const t = useT();
  return (
    <>
      {/* Not a row of bars. Every voice product on the internet draws the same
          twenty orange rectangles, and this page already owns a better mark for
          the same idea: the pulli, the dot grid a kolam is looped through,
          which the hero background and the microphone ring are both drawn from.
          So the level is set in dots — a column per slice of time, lit outward
          from the centre line by how loud that slice was.

          Nothing moves but opacity, on thirty times seven nodes that never
          reflow. When motion is off each dot holds its resting value, so the
          still frame is the sentence itself rather than an empty grid. */}
      <div className="flex items-center justify-between gap-[2px]" aria-hidden>
        {WAVE.map((amp, i) => (
          <span key={i} className="flex flex-col gap-[5px]">
            {Array.from({ length: ROWS }, (_, row) => (
              <span
                key={row}
                className="pulli-cell h-[4.5px] w-[4.5px] rounded-full bg-urgent"
                style={{
                  "--o": litness(row, amp),
                  "--o2": litness(row, peak(amp)),
                  "--n": i,
                } as React.CSSProperties}
              />
            ))}
          </span>
        ))}
      </div>

      <p className="mt-5 text-[0.9375rem] leading-[1.5]">
        <span className="quiet-em text-ink">{QUOTE}</span>
      </p>
      <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-3">{t("hero.deck.langs")}</p>
    </>
  );
}

/* ══ 02 · What it heard ═════════════════════════════════════════════════════ */

function Facts() {
  const t = useT();
  const facts: [string, string][] = [
    [t("hero.deck.f.amount"), `₹${Number(EXTRACTED.amount_inr ?? 0).toLocaleString("en-IN")}`],
    [t("hero.deck.f.method"), String(EXTRACTED.payment_method ?? "—")],
    [t("hero.deck.f.category"), String(EXTRACTED.possible_category ?? "—")],
  ];

  return (
    <dl>
      {facts.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-t border-rule py-3">
          <dt className="shrink-0 text-[0.8125rem] text-ink-3">{k}</dt>
          <dd className="flex items-baseline gap-2 text-end text-[0.9375rem] font-medium leading-snug">
            <span>{v}</span>
            <Check />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ══ 03 · Ten tracks, ten clocks ════════════════════════════════════════════ */

const CLOCKS: [DictKey, DictKey][] = [
  ["hero.deck.k1", "hero.deck.k1v"],
  ["hero.deck.k2", "hero.deck.k2v"],
  ["hero.deck.k3", "hero.deck.k3v"],
  ["hero.deck.k4", "hero.deck.k4v"],
];

function Clocks() {
  const t = useT();
  return (
    <ul>
      {CLOCKS.map(([k, v]) => (
        <li key={k} className="flex items-baseline justify-between gap-4 border-t border-rule py-2.5">
          <span className="text-[0.875rem]">{t(k)}</span>
          <span className="num shrink-0 text-[0.75rem] font-bold text-[color:var(--urgent-ink)]">{t(v)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ══ 04 · Your paperwork ════════════════════════════════════════════════════ */

const DRAFTS: [DictKey, DictKey | null][] = [
  ["hero.deck.d1", null],
  ["hero.deck.d2", null],
  ["hero.deck.d3", null],
  ["hero.deck.d4", "hero.deck.d4s"],
];

function Drafts() {
  const t = useT();
  return (
    <ul className="space-y-2">
      {DRAFTS.map(([k, sub]) => (
        <li key={k} className="flex items-center gap-3 rounded-ctl border border-rule px-3 py-2.5">
          <Page />
          <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
            {t(k)}
            {sub && <span className="num ms-1.5 text-[0.6875rem] text-ink-3">{t(sub)}</span>}
          </span>
          <span className="shrink-0 text-[0.6875rem] font-medium text-[color:var(--done)]">
            {t("hero.deck.ready")}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ══ 05 · The hand-off ══════════════════════════════════════════════════════ */

const CHANNELS: [DictKey, DictKey][] = [
  ["hero.deck.c1", "hero.deck.c1s"],
  ["hero.deck.c2", "hero.deck.c2s"],
  ["hero.deck.c3", "hero.deck.c3s"],
];

function Filing() {
  const t = useT();
  return (
    <ul>
      {CHANNELS.map(([k, sub]) => (
        <li key={k} className="flex items-center gap-3 border-t border-rule py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium leading-snug">{t(k)}</span>
            <span className="block text-[0.75rem] text-ink-3">{t(sub)}</span>
          </span>
          {/* Outward, because this is the point where the person leaves and
              does it themselves. */}
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink-3 rtl:-scale-x-100"
            aria-hidden
          >
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </li>
      ))}
    </ul>
  );
}

/* ══ 06 · Nothing gets lost ═════════════════════════════════════════════════ */

const VAULT: [DictKey, DictKey][] = [
  ["hero.deck.v1", "hero.deck.v1v"],
  ["hero.deck.v2", "hero.deck.v2v"],
  ["hero.deck.v3", "hero.deck.v3v"],
];

function Vault() {
  const t = useT();
  return (
    <ul>
      {VAULT.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-4 border-t border-rule py-3">
          <span className="text-[0.875rem]">{t(k)}</span>
          <span className="shrink-0 rounded-ctl bg-done-soft px-2 py-1 text-[0.6875rem] font-medium text-[color:var(--ink-2)]">
            {t(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ══ 07 · Before any money moves ════════════════════════════════════════════ */

const WARNINGS: DictKey[] = ["hero.deck.w1", "hero.deck.w2", "hero.deck.w3"];

function Checker() {
  const t = useT();
  return (
    <>
      {/* Tagged as an example, because it is one. The verdict below it is what
          the checker says about this text — never that anything is safe, which
          it has no way of knowing. */}
      <div className="rounded-card border border-rule bg-sunk p-3">
        <p className="label">{t("hero.deck.example")}</p>
        <p className="mt-1.5 text-[0.8125rem] leading-[1.45] text-ink-2">{t("hero.deck.sms")}</p>
      </div>

      <p className="mt-3 self-start inline-flex items-center gap-2 rounded-ctl bg-urgent-soft px-2.5 py-1 text-[0.75rem] font-bold text-[color:var(--urgent-ink)]">
        <span className="h-1.5 w-1.5 rounded-full bg-urgent" aria-hidden />
        {t("hero.deck.verdict")}
      </p>

      <ul className="mt-3 space-y-1.5">
        {WARNINGS.map((k) => (
          <li key={k} className="flex items-baseline gap-2.5 text-[0.8125rem] leading-snug text-ink-2">
            <span className="mt-[0.4em] h-1 w-1 shrink-0 rounded-full bg-urgent" aria-hidden />
            {t(k)}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ══ Marks ══════════════════════════════════════════════════════════════════ */

function Check() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 self-center text-[color:var(--done)]"
      aria-hidden
    >
      <path d="M4 13l5 5L20 6" />
    </svg>
  );
}

function Page() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 text-ink-3"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
