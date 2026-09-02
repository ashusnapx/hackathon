"use client";

import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";
import { Builders } from "@/components/landing/Builders";
import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

const HELPLINES = [
  ["1930", "footer.h1930"],
  ["1091", "footer.h1091"],
  ["112", "footer.h112"],
  ["14416", "footer.h14416"],
] as const;

const PORTALS = [
  ["https://cybercrime.gov.in", "footer.ncrp"],
  ["https://sancharsaathi.gov.in/sfc/", "footer.chakshu"],
  ["https://cms.rbi.org.in", "footer.rbi"],
] as const;

/**
 * The closing slab. The reference ends on a rounded dark panel carrying one
 * last ask, and so does this.
 *
 * `.on-dark` flips ink, rule and the semantic colours for everything inside,
 * which is why nothing below reaches for `text-paper/60` any more: `text-ink-2`
 * means "secondary text on whatever this panel is" in both directions.
 */
export function Footer() {
  const t = useT();

  return (
    <footer className="on-dark panel-full overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        {/* The last ask on the left, the people who built it on the right. */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-x-16 gap-y-14 items-start">
          <div className="max-w-2xl">
            <h2>
              <Headline>{t("footer.cta")}</Headline>
            </h2>
            <p
              className="mt-6 text-[1.0625rem] sm:text-lg text-ink-2"
              data-reveal
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {t("footer.ctaSub")}
            </p>
            <Button href="/report" size="lg" className="mt-9 press">
              {t("hero.cta")}
            </Button>
          </div>

          <Builders />
        </div>

        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-10 border-t border-rule pt-12">
          <div>
            <p className="label">{t("footer.helplines")}</p>
            <ul className="mt-5 space-y-3">
              {HELPLINES.map(([num, k]) => (
                <li key={num}>
                  <a href={`tel:${num}`} className="flex items-baseline gap-3 hover:text-ink transition-colors">
                    <span className="figure text-2xl">{num}</span>
                    <span className="text-sm text-ink-3">{t(k)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">{t("footer.official")}</p>
            <ul className="mt-5 space-y-3">
              {PORTALS.map(([href, k]) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-grow text-[0.9375rem] text-ink-2 hover:text-ink transition-colors"
                  >
                    {t(k)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:text-end">
            <Wordmark href={null} />
            <p className="mt-5 text-sm leading-relaxed text-ink-3 lg:ms-auto max-w-sm">
              {t("footer.built")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
