"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

/**
 * The argument in one screen.
 *
 * The full version lives at /compare, where someone who wants to check the
 * claims can check them. Here it is a screenshot of the current form and three
 * lines about what it costs, which is the whole point.
 *
 * The screenshot gets the reference's media treatment: full width of the
 * measure, a card radius, and a scroll-scrubbed arrival that settles it into
 * place. It is the only photograph-like thing on the page and it is the
 * evidence, so it is allowed to be the biggest object in the section.
 *
 * The screenshots are public government pages, captured on the date shown.
 * Kavach carries none of the emblem or the I4C mark in its own interface.
 */

const CAPTURED = "2026-09-02";

const POINTS = ["cmp.p1", "cmp.p2", "cmp.p3"] as const;

export function Compare() {
  const t = useT();

  return (
    <section id="compare" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-x-14 gap-y-8 items-end">
          <h2>
            <Headline>{t("cmp.land.h2")}</Headline>
          </h2>
          <p
            className="lg:pb-3 text-[1.0625rem] leading-[1.55] text-ink-2"
            data-reveal
            style={{ "--i": 1 } as React.CSSProperties}
          >
            {t("cmp.land.lede")}
          </p>
        </div>

        <figure className="mt-12 sm:mt-16 scrub-grow origin-center overflow-hidden rounded-card border border-rule bg-raised">
          <Image
            src="/gov/ncrp-login.jpg"
            alt={t("cmp.shot.login")}
            width={1400}
            height={968}
            className="w-full h-auto border-b border-rule"
            sizes="(min-width: 1024px) 1100px, 100vw"
          />
          <figcaption className="px-5 py-3.5 num text-xs text-ink-3">
            cybercrime.gov.in · {t("cmp.captured")} {CAPTURED}
          </figcaption>
        </figure>

        <ul
          className="mt-12 grid sm:grid-cols-3 gap-px bg-rule border border-rule rounded-card overflow-hidden"
          data-reveal
        >
          {POINTS.map((k, i) => (
            <li key={k} className="bg-paper p-6 sm:p-7">
              <span className="figure text-[2rem] text-urgent-ink">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-4 text-[0.9375rem] leading-[1.55]">{t(k)}</p>
            </li>
          ))}
        </ul>

        <Button href="/compare" size="md" variant="secondary" className="mt-10 press">
          {t("cmp.land.cta")}
        </Button>
      </div>
    </section>
  );
}
