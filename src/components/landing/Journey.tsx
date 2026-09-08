"use client";

import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

/**
 * The whole thing, on one road.
 *
 * The page already explains how the product works — four steps, dealt over each
 * other, most of the way down. This is not that. It is the map you get before
 * you decide to read anything: the arc a person is actually on, starting one
 * minute before they have heard of Kavach and ending weeks after, with the
 * product's part marked out inside it.
 *
 * ── The two stages we are not in ────────────────────────────────────────────
 *
 * Stage 01 is the money leaving and the call to 1930, which happens before
 * anybody arrives here and matters more than anything on this site. Stage 05 is
 * the citizen filing on an official channel — Kavach drafts it and never
 * submits it, and nothing counts as filed until a real channel returns a real
 * receipt.
 *
 * Both are on the road, both are labelled "not Kavach", and their markers are
 * hollow. A journey diagram that quietly began at "you tell us" and ended at
 * "filed" would be the product claiming the whole road, and would be the one
 * dishonest thing on a page that spends the rest of its length refusing to
 * overstate what it has done.
 *
 * ── Why a road and not a progress bar ───────────────────────────────────────
 *
 * The markers are kos minar — the pillars set along the Grand Trunk Road to
 * count a kos travelled. The motif is already in this stylesheet and it is here
 * for the reason given there: a milestone counts ground covered on a journey
 * whose end is not in sight, which is the shape of a fraud case and exactly
 * what a percentage gets wrong. Nobody can honestly tell somebody they are
 * "60% recovered".
 *
 * The road runs horizontally from lg, where six stages fit; below that it turns
 * and runs down the inline-start edge, which is the same diagram rotated rather
 * than a second component.
 */

interface Stage {
  n: string;
  t: DictKey;
  b: DictKey;
  time: DictKey;
  who: DictKey;
  /** False for the two stages this product is not part of. */
  ours: boolean;
}

const STAGES: Stage[] = [
  { n: "01", t: "journey.s1.t", b: "journey.s1.b", time: "journey.s1.time", who: "journey.s1.who", ours: false },
  { n: "02", t: "journey.s2.t", b: "journey.s2.b", time: "journey.s2.time", who: "journey.s2.who", ours: true },
  { n: "03", t: "journey.s3.t", b: "journey.s3.b", time: "journey.s3.time", who: "journey.s3.who", ours: true },
  { n: "04", t: "journey.s4.t", b: "journey.s4.b", time: "journey.s4.time", who: "journey.s4.who", ours: true },
  { n: "05", t: "journey.s5.t", b: "journey.s5.b", time: "journey.s5.time", who: "journey.s5.who", ours: false },
  { n: "06", t: "journey.s6.t", b: "journey.s6.b", time: "journey.s6.time", who: "journey.s6.who", ours: true },
];

export function Journey() {
  const t = useT();

  return (
    <section id="journey" aria-labelledby="journey-h" className="bg-paper border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="label">{t("journey.kicker")}</p>
          <h2 id="journey-h" className="mt-4">
            <Headline>{t("journey.h2")}</Headline>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[1.0625rem] leading-[1.55] text-ink-2">
            {t("journey.sub")}
          </p>
        </div>

        {/* The road. A hairline down the inline-start edge below lg, and across
            the top from lg — one border swapped for another, so the markers and
            the copy never move between the two. */}
        <ol
          className={cn(
            "mt-12 sm:mt-16",
            "border-s border-rule-strong ps-7",
            "lg:border-s-0 lg:ps-0 lg:border-t lg:grid lg:grid-cols-6",
          )}
          data-reveal
        >
          {STAGES.map((s, i) => (
            <li
              key={s.n}
              className={cn(
                "relative",
                // Down the road on small screens, along it from lg.
                "pb-10 last:pb-0 lg:pb-0 lg:pt-7 lg:pe-5 lg:last:pe-0",
                // A column so the "who" chip can be pushed to a common
                // baseline; without it six chips sit at six heights.
                "lg:flex lg:flex-col",
                // The vertical rule between stages, from lg only.
                "lg:border-s lg:border-rule lg:ps-5 lg:first:border-s-0 lg:first:ps-0",
                s.ours ? "text-ink" : "text-ink-3",
              )}
              style={{ "--i": i } as React.CSSProperties}
            >
              {/* Below lg the marker sits on the vertical road to the side;
                  from lg it takes its default place on the horizontal one. The
                  hollow ones are the stages this product is not part of. */}
              <span
                className={cn(
                  "absolute -start-7 top-[0.3rem] h-[0.45rem] w-[0.45rem] rotate-45 rounded-[1px]",
                  "-translate-x-1/2 rtl:translate-x-1/2 lg:hidden",
                  s.ours ? "bg-current" : "border border-current bg-paper",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "hidden lg:block absolute -top-[0.28rem] start-0 h-[0.45rem] w-[0.45rem] rotate-45 rounded-[1px]",
                  s.ours ? "bg-current" : "border border-current bg-paper",
                )}
                aria-hidden
              />

              <div className="flex items-baseline gap-2.5">
                <span className="num text-[0.6875rem] text-ink-3">{s.n}</span>
                <span className="num text-[0.6875rem] text-ink-3">{t(s.time)}</span>
              </div>

              <h3 className="mt-3 text-[1.25rem] leading-[1.15] max-w-[26ch] lg:max-w-[16ch] text-ink">{t(s.t)}</h3>

              <p className="mt-2.5 max-w-[52ch] lg:max-w-[34ch] text-[0.9375rem] leading-[1.5] text-ink-2">
                {t(s.b)}
              </p>

              {/* Who is doing it. The two that say "not Kavach" are the reason
                  this rail exists in this form. */}
              <p
                className={cn(
                  "mt-4 lg:mt-auto lg:pt-4 self-start inline-flex items-center rounded-ctl px-2 py-1 text-[0.6875rem] font-medium tracking-wide",
                  s.ours
                    ? "bg-done-soft text-[color:var(--ink-2)]"
                    : "border border-rule-strong text-ink-3",
                )}
              >
                {t(s.who)}
              </p>
            </li>
          ))}
        </ol>

        {/* The constants. True at every stage above rather than at one of them,
            which is why they are a row under the road and not a seventh
            milestone on it. */}
        <ul className="mt-14 grid sm:grid-cols-3 border-t border-rule">
          {(["hero.point1", "hero.point2", "hero.point3"] as const).map((k) => (
            <li
              key={k}
              className="py-5 sm:px-6 sm:first:ps-0 sm:last:pe-0 border-b border-rule sm:border-b-0 sm:border-s sm:first:border-s-0 text-[0.9375rem] leading-snug text-ink-2"
            >
              {t(k)}
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-[62ch] text-sm leading-[1.55] text-ink-3">{t("journey.note")}</p>
      </div>
    </section>
  );
}
