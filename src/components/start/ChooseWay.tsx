"use client";

import Link from "next/link";
import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * How would you like to tell us?
 *
 * Three ways in, described by what the person has to do rather than by the
 * technology behind them. "Vaani call", "web chat" and "WhatsApp preview" are
 * our words for our plumbing; "you talk and we listen" versus "we ask and you
 * answer" is a difference somebody can actually choose between, and it is the
 * difference that matters — a person who knows exactly what happened wants the
 * first, and a person too shaken to know where to begin wants the second.
 *
 * Built to be usable by somebody who reads slowly or not at all: numbered so a
 * helper can say "press two", an icon on every card, one short line each, and
 * targets big enough to hit without aiming. The first is filled because there
 * has to be an obvious one to press when none of the words land.
 */
export function ChooseWay() {
  const t = useT();
  return (
    <>
      <SiteHeader width="2xl" />
      <main id="main" className="px-5 sm:px-8 py-6 sm:py-12 flex items-start justify-center">
        <div className="w-full max-w-xl">
          <h1 className="text-[1.75rem] sm:text-3xl leading-tight">{t("choose.h")}</h1>
          <p className="mt-2 text-[1.0625rem] leading-[1.5] text-ink-2">{t("choose.sub")}</p>

          <div className="mt-6 grid gap-3">
            <Way
              n={1}
              href="/say"
              title={t("choose.sayH")}
              note={t("choose.sayNote")}
              icon={<MicGlyph />}
              primary
            />
            <Way
              n={2}
              href="/talk"
              title={t("choose.talkH")}
              note={t("choose.talkNote")}
              icon={<Image src="/vaani/vaani-mark.png" alt="" width={72} height={72} className="w-7 h-7" />}
            />
            <Way
              n={3}
              href="/whatsapp"
              title={t("choose.waH")}
              note={t("choose.waNote")}
              icon={<span className="text-[#25D366]"><WhatsAppGlyph /></span>}
            />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2">
            <Button href="tel:1930" external variant="urgent" size="md">{t("begin.call1930short")}</Button>
            <Button href="tel:112" external variant="secondary" size="md">{t("begin.call112short")}</Button>
          </div>

          <details className="mt-6">
            <summary className="inline-flex min-h-11 items-center text-sm text-ink-3 underline underline-offset-4 cursor-pointer hover:text-ink">
              {t("begin.safeSummary")}
            </summary>
            <p className="mt-2 text-sm leading-[1.6] text-ink-2">{t("begin.boundaryNote")}</p>
            <a href="/report" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
              {t("begin.formLink")} →
            </a>
          </details>
        </div>
      </main>
    </>
  );
}

function Way({ n, href, title, note, icon, primary }: {
  n: number;
  href: string;
  title: string;
  note: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-card border px-4 py-4 sm:px-5 transition-colors no-underline",
        // Comfortably past the 44px floor: this is the whole decision on the
        // page, and it should be hittable without aiming.
        "min-h-[5.5rem]",
        primary
          ? "bg-deep border-deep text-[#ffffeb] hover:opacity-95"
          : "bg-raised border-rule-strong hover:border-ink",
      )}
    >
      <span
        className={cn(
          "grid place-items-center w-12 h-12 shrink-0 rounded-full",
          primary ? "bg-[#ffffeb]/15" : "bg-sunk",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold leading-snug">{title}</span>
        <span className={cn("mt-0.5 block text-sm leading-[1.45]", primary ? "text-[#ffffeb]/75" : "text-ink-3")}>
          {note}
        </span>
      </span>
      {/* The number is for a helper reading the screen out: "press two". */}
      <span
        className={cn(
          "grid place-items-center w-7 h-7 shrink-0 rounded-full num text-sm",
          primary ? "bg-[#ffffeb]/15 text-[#ffffeb]" : "bg-sunk text-ink-3",
        )}
        aria-hidden
      >
        {n}
      </span>
    </Link>
  );
}

function MicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.4" />
    </svg>
  );
}
