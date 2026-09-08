"use client";

import { useSyncExternalStore } from "react";

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
 *
 * It can be dismissed, and the dismissal is remembered on that device. Somebody
 * using this for a real fraud reads the disclosure once and then has to scroll
 * past it on every screen of a bad week; a judge opening it fresh still sees
 * it. The claim it makes is not lost — the footer states it on every page and
 * the FAQ repeats it, which is why this one is safe to let go of.
 */

const DISMISSED = "kavach.bwmi.dismissed.v1";

/**
 * Read at render rather than set from an effect, so the bar does not appear for
 * a frame and then vanish for somebody who already dismissed it.
 */
function useDismissed(): boolean {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("kavach:bwmi", notify);
      return () => window.removeEventListener("kavach:bwmi", notify);
    },
    () => {
      try {
        return localStorage.getItem(DISMISSED) === "1";
      } catch {
        // Private windows and blocked site data both throw. The bar simply
        // stays, which is the safe direction for a disclosure.
        return false;
      }
    },
    () => false,
  );
}

export function HackathonBar() {
  const t = useT();
  const dismissed = useDismissed();

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Nothing to remember it with; hide it for this page at least.
    }
    window.dispatchEvent(new Event("kavach:bwmi"));
  };

  return (
    <div className="on-deep relative print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 pe-11 text-center">
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

      <button
        onClick={dismiss}
        aria-label={t("bwmi.dismiss")}
        className="absolute inset-y-0 end-1 grid w-9 place-items-center text-ink-2 transition-colors hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
