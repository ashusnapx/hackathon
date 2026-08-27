"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";

export function Hero() {
  const t = useT();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 ledger pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24">
        {/* The emergency line sits above the headline, because for some readers
            arriving here it is the only thing on the page that matters. */}
        <a
          href="tel:1930"
          className="inline-flex items-center gap-2.5 rounded-[3px] border border-urgent/35 bg-urgent-soft px-3.5 py-2 text-[0.9375rem] text-urgent-ink hover:border-urgent transition-colors rise"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-urgent opacity-70 pulse-ring" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-urgent" />
          </span>
          <span className="font-medium">{t("sos.title")}</span>
          <span className="num font-semibold underline underline-offset-2">1930</span>
        </a>

        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-x-14 gap-y-10 items-end">
          <div>
            <p className="label rise" style={{ animationDelay: "40ms" }}>{t("hero.eyebrow")}</p>

            <h1 className="mt-4 text-[2.75rem] sm:text-6xl lg:text-[4.25rem] leading-[1.02]">
              <span className="block rise" style={{ animationDelay: "80ms" }}>{t("hero.h1a")}</span>
              <span className="block rise text-ink-2" style={{ animationDelay: "140ms" }}>{t("hero.h1b")}</span>
            </h1>

            <p
              className="mt-7 max-w-2xl text-[1.0625rem] sm:text-lg leading-[1.65] text-ink-2 rise"
              style={{ animationDelay: "200ms" }}
            >
              {t("hero.sub")}
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 rise" style={{ animationDelay: "260ms" }}>
              <Button href="/start" size="lg" className="sm:w-auto">
                {t("hero.cta")}
                <Arrow />
              </Button>
              <Button href="/check" size="lg" variant="secondary">{t("hero.cta3")}</Button>
            </div>

            <p className="mt-5 text-sm text-ink-3">{t("hero.notOfficial")}</p>
          </div>

          {/* Three claims, set as a ruled list — like the margin notes on a form. */}
          <ul className="grid gap-0 rise lg:pb-2" style={{ animationDelay: "320ms" }}>
            {(["hero.point1", "hero.point2", "hero.point3"] as const).map((k, i) => (
              <li key={k} className="flex gap-4 py-4 border-t border-rule last:border-b">
                <span className="num text-xs text-ink-3 pt-1 w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[0.9375rem] leading-snug">{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="rtl:rotate-180">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
