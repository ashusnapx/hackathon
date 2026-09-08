"use client";

import { useT } from "@/lib/i18n/context";

/**
 * The strip above everything else, saying what this is.
 *
 * It sits in normal flow rather than sticking, above every header on the site.
 * That ordering is the whole point: the first thing anybody reads is that this
 * is a hackathon prototype and not a government service, which is the same
 * disclosure the footer makes and the FAQ repeats — said once more where it
 * cannot be missed.
 *
 * Deep rather than cream. Every header below it is a pale floating pill, so a
 * dark band reads as chrome belonging to the page rather than to the product,
 * and it is the one element on the site that spans the full width. `on-deep`
 * flips every colour token once, so the children below use the ordinary
 * `text-ink-2` names and stay correct in light, dark and print.
 */
export function HackathonBar() {
  const t = useT();

  return (
    <div className="on-deep print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <span className="inline-flex shrink-0 items-center gap-2">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-wait opacity-70 pulse-ring" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-wait" />
          </span>
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-wait">
            {t("bwmi.badge")}
          </span>
        </span>

        <span className="text-[0.8125rem] leading-snug text-ink-2">{t("bwmi.text")}</span>

        <a
          href="https://buildwhatmovesindia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-ink underline decoration-ink/40 underline-offset-[3px] transition-colors hover:text-wait hover:decoration-wait"
        >
          {t("bwmi.link")}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  );
}
