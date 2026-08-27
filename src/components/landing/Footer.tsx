"use client";

import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";
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

export function Footer() {
  const t = useT();

  return (
    <footer className="border-t border-rule bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-4xl sm:text-5xl">{t("footer.cta")}</h2>
          <p className="mt-4 text-[1.0625rem] text-paper/65">{t("footer.ctaSub")}</p>
          <Button
            href="/start"
            size="lg"
            className="mt-8 bg-paper text-ink border-paper hover:bg-paper/90"
          >
            {t("hero.cta")}
          </Button>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-10 border-t border-paper/15 pt-10">
          <div>
            <p className="label !text-paper/45">{t("footer.helplines")}</p>
            <ul className="mt-4 space-y-2.5">
              {HELPLINES.map(([num, k]) => (
                <li key={num}>
                  <a href={`tel:${num}`} className="flex items-baseline gap-3 hover:text-white transition-colors">
                    <span className="num text-lg font-medium">{num}</span>
                    <span className="text-sm text-paper/60">{t(k)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label !text-paper/45">{t("footer.official")}</p>
            <ul className="mt-4 space-y-2.5">
              {PORTALS.map(([href, k]) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.9375rem] text-paper/75 hover:text-white transition-colors underline underline-offset-4 decoration-paper/25"
                  >
                    {t(k)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:text-end">
            <Wordmark href={null} className="text-paper" />
            <p className="mt-4 text-sm leading-relaxed text-paper/50 lg:ms-auto max-w-sm">
              {t("footer.built")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
