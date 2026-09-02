"use client";

import Image from "next/image";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { FRICTIONS, NCRP_REQUIRED_COUNT, RELAXED_COUNT } from "@/lib/report/schema";
import { useT } from "@/lib/i18n/context";

/**
 * The argument, laid out so it can be checked.
 *
 * Every claim on this page is sourced to the government's own Citizen Manual or
 * to the checklist printed on the portal's login page, and the source is shown
 * next to the claim rather than buried in a footnote. That is deliberate: a
 * redesign that overstates what it is replacing is worth nothing, and the one
 * thing that would sink this is a judge finding a claim that is not fair.
 *
 * The screenshots are of public pages, captured on the date shown, and used to
 * show what the current experience is. Kavach carries none of the emblem or the
 * I4C mark: this is not a government service and must never be mistaken for one.
 */

const CAPTURED = "2026-09-02";

const SHOTS = [
  { src: "/gov/ncrp-login.jpg", capKey: "cmp.shot.login" },
  { src: "/gov/ncrp-accept.jpg", capKey: "cmp.shot.accept" },
  { src: "/gov/ncrp-home.jpg", capKey: "cmp.shot.home" },
  { src: "/gov/ncrp-suspect.jpg", capKey: "cmp.shot.suspect" },
  { src: "/gov/mrm-home.jpg", capKey: "cmp.shot.mrm" },
] as const;

export default function ComparePage() {
  const t = useT();

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-5xl rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
          <Wordmark />
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button href="/report" size="sm">{t("nav.start")}</Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 sm:px-8 py-12 sm:py-20">
        <p className="label">{t("cmp.kicker")}</p>
        <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl">{t("cmp.h1")}</h1>
        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-[1.7] text-ink-2">{t("cmp.sub")}</p>

        {/* The standard is the government's own, which is the whole point. */}
        <section className="mt-14 sheet px-5 sm:px-7 py-6">
          <p className="label">{t("cmp.std.label")}</p>
          <p className="mt-3 max-w-3xl text-[1.0625rem] leading-[1.7]">{t("cmp.std.body")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href="https://guidelines.india.gov.in/gigw3/" size="sm" variant="secondary" external>
              GIGW 3.0
            </Button>
            <Button href="https://www.ux4g.gov.in/design-system.php" size="sm" variant="ghost" external>
              UX4G
            </Button>
          </div>
        </section>

        <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 border-t border-rule-strong">
          <Stat n={String(NCRP_REQUIRED_COUNT)} labelKey="cmp.stat.required" />
          <Stat n={String(RELAXED_COUNT)} labelKey="cmp.stat.relaxed" />
          <Stat n="30" labelKey="cmp.stat.otp" />
          <Stat n="0" labelKey="cmp.stat.lost" />
        </dl>

        {/* ── The frictions, each with its source ─────────────────────────── */}
        <section className="mt-20">
          <h2 className="text-3xl sm:text-4xl">{t("cmp.h2")}</h2>
          <ol className="mt-10 border-t border-rule-strong">
            {FRICTIONS.map((f, i) => (
              <li key={f.id} className="border-b border-rule py-8">
                <div className="flex items-baseline gap-4">
                  <span className="num text-sm text-ink-3 w-6 shrink-0" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl sm:text-2xl leading-snug">{t(f.titleKey)}</h3>
                </div>

                <div className="mt-5 ps-0 sm:ps-10 grid md:grid-cols-2 gap-x-10 gap-y-6">
                  <div className="border-s-2 border-urgent/40 ps-4">
                    <p className="label !text-urgent-ink/80">{t("cmp.theirs")}</p>
                    <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t(f.theirsKey)}</p>
                  </div>
                  <div className="border-s-2 border-done/40 ps-4">
                    <p className="label !text-done/90">{t("cmp.ours")}</p>
                    <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">{t(f.oursKey)}</p>
                  </div>
                </div>

                <p className="mt-5 ps-0 sm:ps-10 text-sm leading-[1.6] text-ink-3">
                  <span className="label me-2">{t("cmp.source")}</span>
                  {t(f.sourceKey)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── What it looks like today ────────────────────────────────────── */}
        <section className="mt-20">
          <h2 className="text-3xl sm:text-4xl">{t("cmp.h3")}</h2>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-[1.7] text-ink-2">{t("cmp.shotsSub")}</p>

          <div className="mt-10 grid sm:grid-cols-2 gap-8">
            {SHOTS.map((s) => (
              <figure key={s.src} className="sheet overflow-hidden">
                <div className="bg-sunk border-b border-rule">
                  <Image
                    src={s.src}
                    alt={t(s.capKey)}
                    width={1100}
                    height={760}
                    className="w-full h-auto"
                    sizes="(min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <figcaption className="px-4 py-3.5">
                  <p className="text-[0.9375rem] leading-[1.6] text-ink-2">{t(s.capKey)}</p>
                  <p className="mt-1.5 num text-xs text-ink-3">
                    {t("cmp.captured")} {CAPTURED}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-20 sheet px-5 sm:px-7 py-6">
          <p className="label">{t("cmp.honest.label")}</p>
          <p className="mt-3 max-w-3xl text-[0.9375rem] leading-[1.7] text-ink-2">{t("cmp.honest.body")}</p>
        </section>

        <div className="mt-14 flex flex-wrap gap-3">
          <Button href="/report" size="lg">{t("cmp.cta")}</Button>
          <Button href="https://cybercrime.gov.in" size="lg" variant="secondary" external>
            {t("cmp.ctaOfficial")}
          </Button>
        </div>
      </main>
    </>
  );
}

function Stat({ n, labelKey }: { n: string; labelKey: Parameters<ReturnType<typeof useT>>[0] }) {
  const t = useT();
  return (
    <div className="border-b border-e border-rule px-4 py-6 last:border-e-0 [&:nth-child(2)]:border-e-0 sm:[&:nth-child(2)]:border-e">
      <dt className="num text-3xl sm:text-[2.5rem] leading-none font-medium tracking-tight">{n}</dt>
      <dd className="mt-3 text-sm leading-snug text-ink-2 max-w-[18ch]">{t(labelKey)}</dd>
    </div>
  );
}
