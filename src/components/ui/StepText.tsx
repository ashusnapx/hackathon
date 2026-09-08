import { Fragment } from "react";

/**
 * A step, with the parts of it you can act on made actionable.
 *
 * Three things happen to a step's text here, and all three exist because a
 * step that names something without letting you do it is a step that makes the
 * person go and find it:
 *
 *  · `**bold**` marks the load-bearing words, so the line survives being
 *    scanned rather than read.
 *  · A government address in the text becomes a link that opens in a new tab.
 *    "Open cybercrime.gov.in" was a sentence somebody had to retype into an
 *    address bar, on a phone, having just lost money — and a mistyped
 *    government domain is exactly how a person looking for the real portal
 *    lands on a copy of it.
 *  · `[[doc]]` becomes a button that opens the drafted document for that step,
 *    so "paste the description we wrote" no longer means going two screens
 *    away, finding the right one of five, and losing your place on the way
 *    back.
 *
 * The domain list is a fixed allowlist, not a URL matcher. Auto-linking
 * anything that looks like a domain in a string that will one day be
 * translated by a third party is a way to end up rendering somebody else's
 * link inside our own instructions.
 */

/**
 * Every address this product tells people to visit.
 *
 * Kept here rather than derived from the text so the set is auditable in one
 * place: these are the only destinations a step can send somebody to.
 */
const KNOWN_SITES: Record<string, string> = {
  "cybercrime.gov.in": "https://cybercrime.gov.in",
  "sancharsaathi.gov.in": "https://sancharsaathi.gov.in",
  "cms.rbi.org.in": "https://cms.rbi.org.in",
  "nalsa.gov.in": "https://nalsa.gov.in",
};

/** Longest first, so a domain that contains another matches whole. */
const DOMAINS = Object.keys(KNOWN_SITES).sort((a, b) => b.length - a.length);

/**
 * Splits a step into its actionable parts.
 *
 * Exported so the test uses this exact expression. The first version of that
 * test rebuilt the regex by hand, passed, and missed that the one in the
 * component had one backslash too many in every escape — so every step
 * rendered `**bold**` and `[[doc]]` as literal characters on screen while the
 * test stayed green. A test that re-implements the thing it is testing tests
 * nothing.
 */
export const STEP_SPLIT = new RegExp(
  `(\\*\\*.+?\\*\\*|\\[\\[doc\\]\\]|${DOMAINS.map((d) => d.replace(/\./g, "\\.")).join("|")})`,
  "g",
);

export function StepText({ children, onOpenDoc, docLabel }: {
  children: string;
  /** Supplied when this step's track has a drafted document. */
  onOpenDoc?: () => void;
  docLabel?: string;
}) {
  const parts = children.split(STEP_SPLIT).filter((part) => part !== "");

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-urgent-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part === "[[doc]]") {
          // Nothing is drafted yet, so there is nothing to open. The marker
          // disappears rather than rendering a button that cannot do anything.
          if (!onOpenDoc) return null;
          return (
            <button
              key={i}
              onClick={onOpenDoc}
              className="mx-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-ctl border border-ink/25 bg-raised px-2.5 py-1 align-middle text-[0.875rem] font-medium transition-colors hover:border-ink"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 012-2h10" />
              </svg>
              {docLabel}
            </button>
          );
        }

        const site = KNOWN_SITES[part];
        if (site) {
          return (
            <a
              key={i}
              href={site}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-urgent-ink underline underline-offset-4 hover:text-ink"
            >
              {part}
              <span className="sr-only"> (opens in a new tab)</span>
              <span aria-hidden> ↗</span>
            </a>
          );
        }

        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
