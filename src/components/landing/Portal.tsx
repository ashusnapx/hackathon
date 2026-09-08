"use client";

import Image from "next/image";

import { Chapter, Figure } from "@/components/landing/Chapter";
import { benchmark, PORTAL_OTP_MINUTES } from "@/lib/report/benchmark";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dict/en";

/**
 * Chapter two: what meeting the current system actually looks like.
 *
 * This chapter replaces two that used to sit apart — one about the gap in the
 * advice, one comparing the form field by field. They were making a single
 * argument in two places, and the reader had to hold the first to understand
 * the second.
 *
 * ── The rule this chapter is written under ──────────────────────────────────
 *
 * Every claim is from the Ministry of Home Affairs' own Citizen Manual or the
 * checklist printed on the portal's login page, and the counts are computed
 * from the field schema in `src/lib/report/schema.ts` rather than typed in — so
 * "sixteen fields" cannot drift away from the sixteen fields we actually model.
 *
 * The whole argument collapses the moment one item turns out to be unfair, so
 * three of the eight documented frictions are shown here and the rest live at
 * /compare where they can be checked side by side with their sources. Picking
 * the three most quotable and hiding the workings would be the same move the
 * page is criticising.
 *
 * And the honesty note stays. The portal does things this prototype does not —
 * it routes to the right state agency, issues an acknowledgement, and connects
 * financial reports to institutions through CFCFRMS. Leaving that out to make a
 * cleaner story would make this a hit piece rather than a redesign.
 */

const CAPTURED = "2026-09-02";

const POINTS: DictKey[] = ["cmp.p1", "cmp.p2", "cmp.p3"];

export function Portal() {
  const t = useT();
  const bench = benchmark();

  return (
    <Chapter id="compare" n="02" kicker="ch.portal.k" heading="ch.portal.h" lede="ch.portal.b">
      {/* The three numbers that are the argument.
          Two of them are counted from the field schema rather than typed into a
          translation file, so they cannot go on saying something the product
          stopped doing. The third is the portal's own published figure, and the
          note underneath says which is which — because the difference between
          "we counted this" and "they published this" is exactly the kind of
          thing this chapter is about. */}
      <div className="grid sm:grid-cols-3 gap-x-8 gap-y-10">
        <Figure v={String(bench.portalRequired)} l={t("ch.portal.s1l")} tone="text-[color:var(--urgent-ink)]" />
        <Figure v={String(PORTAL_OTP_MINUTES)} l={t("ch.portal.s2l")} tone="text-[color:var(--urgent-ink)]" />
        <Figure v={String(bench.relaxed)} l={t("ch.portal.s3l")} tone="text-[color:var(--urgent-ink)]" />
      </div>

      {/* The rule runs the full measure; the note keeps its own. Hanging the
          border on the paragraph made it stop wherever the sentence did. */}
      <div className="mt-8 border-b border-rule pb-14">
        <p className="max-w-[62ch] text-[0.8125rem] leading-[1.5] text-ink-3">
          {t("ch.portal.benchNote")}
        </p>
      </div>

      {/* The evidence. It is the only photograph-like thing on the page and it
          is what the argument rests on, so it is allowed to be the biggest
          object in the chapter.

          The screenshots are public government pages, captured on the date
          shown. Kavach carries none of the emblem or the I4C mark itself. */}
      <figure className="mt-14 scrub-grow origin-center overflow-hidden rounded-card border border-rule bg-raised">
        <Image
          src="/gov/ncrp-login.jpg"
          alt={t("cmp.shot.login")}
          width={1600}
          height={900}
          className="w-full h-auto"
          sizes="(min-width: 1024px) 60rem, 100vw"
        />
        <figcaption className="border-t border-rule px-5 py-4 text-[0.8125rem] leading-[1.5] text-ink-3">
          {t("cmp.land.lede")}{" "}
          <span className="num whitespace-nowrap">
            {t("cmp.captured")} {CAPTURED}
          </span>
        </figcaption>
      </figure>

      {/* Three of the eight, each paired with what we do instead. */}
      <ol className="mt-14 grid md:grid-cols-3 gap-px bg-rule border-y border-rule" data-reveal>
        {POINTS.map((k, i) => (
          <li
            key={k}
            className="bg-paper p-6 sm:p-7"
          >
            <span className="num text-[0.6875rem] font-bold text-[color:var(--urgent-ink)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-3 text-[0.9375rem] leading-[1.5] text-ink-2">{t(k)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button href="/compare" variant="secondary" className="press">
          {t("ch.portal.cta")}
        </Button>
      </div>

      {/* What this comparison is not. */}
      <div className="mt-12 max-w-[68ch] border-t border-rule pt-5">
        <p className="label">{t("cmp.honest.label")}</p>
        <p className="mt-3 text-[0.8125rem] leading-[1.55] text-ink-3">{t("cmp.honest.body")}</p>
      </div>
    </Chapter>
  );
}
