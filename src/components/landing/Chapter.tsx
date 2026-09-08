"use client";

import type { ReactNode } from "react";

import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";
import { cn } from "@/lib/utils";

/**
 * One chapter of the page, hung off the road that runs down all of it.
 *
 * ── Why the page is a road ──────────────────────────────────────────────────
 *
 * This landing page had grown to thirteen sections, each with its own kicker,
 * its own heading and its own argument, and no two of them in a stated order.
 * A reader could not tell whether they were four sections from the end or
 * halfway; every band looked like the start of something new. That is what
 * "cluttered" turns out to mean here — not too many pixels, but no spine.
 *
 * So there is one now, literally: a rule down the inline-start edge, running
 * unbroken from the first chapter to the last, with a kos minar at each. Six
 * numbered stops instead of thirteen equal shouts, and at any point on the page
 * you can see how far along you are.
 *
 * The marker is the same one the case timeline uses, for the reason given where
 * it is drawn in globals.css: a kos minar counts ground already covered on a
 * journey whose end is not in sight. That is the shape of a fraud case, and it
 * is the shape of this page's argument too — each chapter is ground covered,
 * and the last one is not a finish line, it is the limit of what we will claim.
 *
 * ── How it survives the coloured slabs ──────────────────────────────────────
 *
 * Chapters run on four different grounds — cream, the deep green, the ink
 * panel. The rail is `border-rule` and the marker is `currentColor`, both of
 * which the `on-deep` and `on-dark` classes redefine, so the road changes
 * colour with the ground it crosses and no chapter needs a variant of its own.
 *
 * Below `lg` the rail collapses: on a phone there is no margin to give it, and
 * a 2px line down the edge of a 390px screen costs more than the orientation it
 * buys. The number stays, because the number is the part doing the work.
 */

interface Props {
  /** Anchor, kept stable so existing links into the page still land. */
  id: string;
  /** Two digits. The reader's position on the road. */
  n: string;
  kicker: DictKey;
  /** Omitted where the chapter's content carries its own heading. */
  heading?: DictKey;
  lede?: DictKey;
  /** A panel class from globals.css, or none for the cream ground. */
  ground?: string;
  /** Chapters whose content is a full-bleed slab manage their own padding. */
  flush?: boolean;
  children?: ReactNode;
}

export function Chapter({ id, n, kicker, heading, lede, ground, flush, children }: Props) {
  const t = useT();

  return (
    <section id={id} className={cn("relative", ground ?? "bg-paper")}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* The road. A border rather than a pseudo-element, so it is exactly as
            tall as the chapter and meets its neighbours with no seam. */}
        <div className={cn("relative lg:border-s lg:border-rule", !flush && "py-16 sm:py-24", flush && "py-0")}>
          <div className={cn("lg:ps-16 xl:ps-24", flush && "py-16 sm:py-24 pb-0 sm:pb-0")}>
            {/* The kos minar, straddling the rule. */}
            <div className="flex items-center gap-4">
              <span
                className="hidden lg:block absolute start-0 h-[0.5rem] w-[0.5rem] -translate-x-1/2 rtl:translate-x-1/2 rotate-45 rounded-[1px] bg-current"
                aria-hidden
              />
              <span className="num text-[0.8125rem] font-bold text-ink-3">{n}</span>
              <span className="h-px w-6 bg-rule-strong" aria-hidden />
              <p className="label">{t(kicker)}</p>
            </div>

            {heading && (
              <h2 className="mt-6 max-w-[19ch]">
                <Headline>{t(heading)}</Headline>
              </h2>
            )}

            {lede && (
              <p
                className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.55] text-ink-2"
                data-reveal
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {t(lede)}
              </p>
            )}
          </div>

          {children && <div className={cn(!flush && "lg:ps-16 xl:ps-24", "mt-12 sm:mt-14")}>{children}</div>}
        </div>
      </div>
    </section>
  );
}

/**
 * The road and the milestone, without a body.
 *
 * Two chapters — the proof and the line — are carried by full-bleed coloured
 * slabs that existed before this restructure and are worth more at full width
 * than they would be squeezed into the text column. Their heading sits on the
 * road here and the slab follows immediately beneath it, so the reader still
 * gets the number and their position, and the panel still gets the whole
 * screen. The rule stops at the panel and picks up at the next chapter, which
 * is the one place the road is allowed a gap: the panel *is* the stop.
 */
export function ChapterHead({
  id, n, kicker, heading, lede, ground,
}: Pick<Props, "id" | "n" | "kicker" | "heading" | "lede" | "ground">) {
  const t = useT();

  return (
    <section id={id} className={cn("relative", ground ?? "bg-paper")}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative lg:border-s lg:border-rule pt-16 sm:pt-24 pb-12 sm:pb-14">
          <div className="lg:ps-16 xl:ps-24">
            <div className="flex items-center gap-4">
              <span
                className="hidden lg:block absolute start-0 h-[0.5rem] w-[0.5rem] -translate-x-1/2 rtl:translate-x-1/2 rotate-45 rounded-[1px] bg-current"
                aria-hidden
              />
              <span className="num text-[0.8125rem] font-bold text-ink-3">{n}</span>
              <span className="h-px w-6 bg-rule-strong" aria-hidden />
              <p className="label">{t(kicker)}</p>
            </div>

            {heading && (
              <h2 className="mt-6 max-w-[19ch]">
                <Headline>{t(heading)}</Headline>
              </h2>
            )}

            {lede && (
              <p
                className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.55] text-ink-2"
                data-reveal
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {t(lede)}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A number set in the display face, with its label under it.
 *
 * The reference reserves Garamond at ninety-six pixels for its single strongest
 * claim. On this page the strongest claims are quantities, so they get the face
 * and the sentence around them gets out of the way.
 */
export function Figure({ v, l, tone }: { v: string; l: string; tone?: string }) {
  return (
    <div>
      <p className={cn("figure text-[2.5rem] sm:text-[3.25rem] leading-[0.95]", tone)}>{v}</p>
      <p className="mt-3 text-[0.9375rem] leading-[1.4] text-ink-2 max-w-[22ch]">{l}</p>
    </div>
  );
}
