"use client";

import { Button } from "@/components/ui/Button";
import { DEMO_CASE_PATH } from "@/lib/demo/id";
import { DEMO_SIGNIN_PATH, demoAccountConfigured } from "@/lib/demo/account";
import { HeroCall } from "@/components/landing/HeroCall";
import { Split, countWords } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

/**
 * The hero: the promise on the left, the product doing it on the right.
 *
 * The type is the reference's — a small tracked eyebrow, two beats of very
 * large Garamond with the second leaning into italic, a short sans lede, one
 * button. The copy already had the right shape for it: "Tell it once." / "Know
 * what to do next." is the same two-beat turn as "Don't type, just speak," and
 * the italic falls on the second beat in both.
 *
 * ── Why it is no longer centred ─────────────────────────────────────────────
 *
 * A centred stack earns its keep when there is exactly one thing to read and
 * one thing to do. This one had grown to twelve objects — an emergency pill, an
 * eyebrow, a headline, a lede, five figures, five generation tags, a caption,
 * three identical buttons, a footnote and a boxed grid of claims — stacked down
 * a single axis over two overlapping background textures, with nothing but
 * vertical distance to say which mattered. Everything looked equally important
 * because everything was in the same place.
 *
 * Splitting it fixes that structurally rather than by deleting things. The left
 * column is a single reading order — 1930, who this is for, what it does, one
 * button — and the right is a single glance. Two things to resolve instead of
 * twelve, and it also stops the hero being the only centred section on a page
 * that is otherwise all asymmetric grids.
 *
 * ── What went, and where ────────────────────────────────────────────────────
 *
 *  · Two of three equal buttons. Three identical rectangles is not a choice,
 *    it is a decision to make, and somebody who has just lost money is in the
 *    worst possible state to be handed one. One filled button; the other two
 *    ways in stay one tap away as a quiet line under it.
 *
 *  · The ledger grid. Two background textures at once — 2.4rem rules under
 *    1.5rem dots — read as neither. The kolam is the one that means something,
 *    so it is the one that stayed, and it now sits behind the card rather than
 *    behind seventy-two-point Garamond.
 *
 *  · The three-claim slab. A filled grid walled in on both edges was the
 *    heaviest object on a page whose heaviest object should be the headline,
 *    and its 01/02/03 ran straight into the journey rail's own 01-06 directly
 *    below it. The claims now close that section instead, as the constant
 *    underneath the six stages rather than as a second numbered list.
 */
export function Hero() {
  const t = useT();
  const line1 = t("hero.h1a");
  const line2 = t("hero.h1b");
  const demoHref = demoAccountConfigured() ? DEMO_SIGNIN_PATH : DEMO_CASE_PATH;
  const demoLabel = t(demoAccountConfigured() ? "demo.cta" : "hero.sampleCta");

  return (
    <section className="relative overflow-hidden">
      {/* The pulli grid a kolam is looped through. One texture, not two, and
          pushed to the side the card sits on: a dot grid behind a serif this
          fine turns both to mud on the cheap screens this is built for, but
          behind a card it reads as the paper the card was set down on. */}
      <div
        className="absolute -top-24 -end-32 h-[44rem] w-[min(62rem,95%)] kolam pointer-events-none text-[color:var(--flare)] opacity-80"
        style={{ maskImage: "radial-gradient(ellipse 46% 46% at 56% 40%, #000 10%, transparent 76%)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-10 pb-14 sm:pt-14 sm:pb-20">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem] gap-x-12 xl:gap-x-16 gap-y-14 items-center">
          {/* ── The promise ──────────────────────────────────────────────── */}
          <div>
            {/* The emergency line and the eyebrow are one block, not two
                objects floating above the headline: for some readers arriving
                here 1930 is the only thing on the page that matters, and for
                everybody else the line under it says who the page is for. */}
            <div className="rise">
              <a
                href="tel:1930"
                className="press inline-flex items-center gap-2.5 rounded-ctl bg-urgent-soft px-4 py-2.5 text-[0.9375rem] transition-colors hover:bg-[color-mix(in_srgb,var(--urgent)_22%,transparent)]"
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-urgent opacity-70 pulse-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-urgent" />
                </span>
                <span className="font-medium text-start">{t("sos.title")}</span>
                <span className="num font-bold tracking-tight text-urgent-ink underline underline-offset-[3px] decoration-1">
                  1930
                </span>
              </a>

              <p className="label mt-6">{t("hero.eyebrow")}</p>
            </div>

            {/* One beat per line. Left to wrap on its own the two sentences
                broke as "Tell it once. Know / what to do next.", which splits
                the italic across the turn and loses the point of having one.
                `Split` is `display: inline` by rule, and a `div` inside an `h1`
                is not phrasing content, so the break comes from a plain block
                wrapper rather than from fighting either. */}
            <h1 className="h1-hero mt-6 max-w-[22ch]">
              <span className="block">
                <Split>{line1}</Split>
              </span>
              <span className="block">
                <Split className="quiet-em" from={countWords(line1)}>
                  {line2}
                </Split>
              </span>
            </h1>

            {/* Caption to the headline, not a second headline. */}
            <p
              className="mt-7 max-w-[44ch] text-[1.0625rem] sm:text-lg leading-[1.55] text-ink-2 rise"
              style={{ animationDelay: "240ms" }}
            >
              {t("hero.sub")}
            </p>

            <div className="mt-9 rise" style={{ animationDelay: "300ms" }}>
              <Button href="/assist" size="lg" className="press">
                {t("hero.cta")}
                <Arrow />
              </Button>

              {/* The other two ways in. Still one tap away, but they no longer
                  ask to be compared with the thing we actually want somebody to
                  do — and a first-time visitor who wants to look before they
                  trust can still get into a real case without an account. */}
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] text-ink-2">
                <QuietLink href="/check">{t("hero.cta3")}</QuietLink>
                <span className="text-ink-3/60" aria-hidden>·</span>
                <QuietLink href={demoHref}>{demoLabel}</QuietLink>
              </p>

              <p className="mt-5 text-sm text-ink-3">{t("hero.notOfficial")}</p>
            </div>
          </div>

          {/* ── The product doing it ─────────────────────────────────────── */}
          <HeroCall />
        </div>

      </div>
    </section>
  );
}

/** A secondary way in. A real link, not a button pretending to be one. */
function QuietLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-ctl underline decoration-rule-strong underline-offset-[5px] decoration-1 transition-colors hover:text-ink hover:decoration-ink focus-visible:decoration-ink"
    >
      {children}
    </a>
  );
}

function Arrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="rtl:rotate-180">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
