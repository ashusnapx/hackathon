import { Fragment, type ReactNode } from "react";

/**
 * Bolds the words between `**` in a translated string.
 *
 * Somebody in the first hour after a fraud does not read a sentence, they scan
 * it. Marking the load-bearing words — the number to call, the category to
 * choose, the thing not to pay for — means the meaning survives being scanned
 * rather than read, which is the way this screen is actually used.
 *
 * The markers live in the dictionary rather than in the component because only
 * a translator knows which word carries the weight in their language. The
 * emphasis in "**Call 1930** from the number linked to the account" does not
 * fall on the same word, or in the same place in the sentence, in Tamil.
 *
 * The emphasis is orange, and specifically `--urgent-ink` rather than the
 * brighter `--flare` it is derived from. Flare is #ff6c4c, which measures
 * 2.77:1 against this cream — it looks like emphasis and fails WCAG AA for body
 * text, so the people most likely to be scanning rather than reading are the
 * ones least able to see it. `--urgent-ink` is the same hue carried to a weight
 * that can hold text: 6.0:1 on paper, 5.5:1 on the sunk panels, 8.6:1 in
 * high-contrast mode and 11.1:1 in dark mode, because it is a token that is
 * redefined per theme rather than one colour hardcoded here.
 *
 * Deliberately only bold. This is not a markdown renderer and must never become
 * one: dictionary strings would then be a place where markup could be written,
 * and they are already the widest surface in this product for text that
 * eventually reaches a police complaint.
 */
export function Emphasis({ children }: { children: string }) {
  const parts = children.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        // Odd indices are the captured groups — the text that was inside the
        // markers. Everything else is passed through untouched.
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-urgent-ink">{part}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** True when a string carries emphasis markers, for callers that branch. */
export function hasEmphasis(value: string): boolean {
  return value.includes("**");
}

export type { ReactNode };
