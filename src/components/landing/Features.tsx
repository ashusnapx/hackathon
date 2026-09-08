"use client";

import { DEMO_CASE_PATH } from "@/lib/demo/id";
import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

/**
 * The whole offering, in one screen.
 *
 * A visitor who lands here hears the problem, sees the government form, and
 * then has to assemble the product from a video and four scattered sections.
 * Judges do not assemble; they skim. So this is the menu: eight cards, each
 * one a thing Kavach does, each one opening the place that does it.
 *
 * Same grammar as the rest of the page — sticky claim on the left, a
 * rule-gapped card grid on the right, numbers in the display face — so it
 * reads as part of the site rather than a brochure stapled on.
 */

const CARDS = [
  { title: "feat.c1t", body: "feat.c1b", href: "/talk" },
  { title: "feat.c2t", body: "feat.c2b", href: "/check" },
  { title: "feat.c3t", body: "feat.c3b", href: "#clocks" },
  { title: "feat.c4t", body: "feat.c4b", href: DEMO_CASE_PATH },
  { title: "feat.c5t", body: "feat.c5b", href: DEMO_CASE_PATH },
  { title: "feat.c6t", body: "feat.c6b", href: DEMO_CASE_PATH },
  { title: "feat.c7t", body: "feat.c7b", href: "/cases" },
  { title: "feat.c8t", body: "feat.c8b", href: "#languages" },
] as const;

export function Features() {
  const t = useT();

  return (
    <section id="features" className="bg-raised border-y border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[23rem_minmax(0,1fr)] gap-x-16 gap-y-12">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="label">{t("feat.kicker")}</p>
            <h2 className="mt-3">
              <Headline>{t("feat.h2")}</Headline>
            </h2>
            <p className="mt-7 text-[1.0625rem] leading-[1.55] text-ink-2" data-reveal>
              {t("feat.lede")}
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-px bg-rule border border-rule rounded-card overflow-hidden self-start">
            {CARDS.map((card, i) => (
              <li key={card.title} className="bg-paper">
                <a
                  href={card.href}
                  aria-label={`${t(card.title as Parameters<typeof t>[0])}`}
                  className="group flex h-full min-h-[13rem] flex-col p-6 sm:p-7 transition-colors hover:bg-ink/[0.04]"
                  data-reveal
                  style={{ "--i": i % 4 } as React.CSSProperties}
                >
                  <span className="figure text-[2rem] leading-none text-urgent-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-4 text-[1.0625rem] font-semibold leading-snug">
                    {t(card.title as Parameters<typeof t>[0])}
                  </span>
                  <span className="mt-2 text-[0.9375rem] leading-[1.55] text-ink-2">
                    {t(card.body as Parameters<typeof t>[0])}
                  </span>
                  <span
                    className="mt-auto pt-4 text-2xl leading-none text-ink-3 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                    aria-hidden
                  >
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
