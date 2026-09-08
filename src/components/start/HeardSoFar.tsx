"use client";

import { useEffect, useMemo, useState } from "react";

import { anyHeard, readHeard } from "@/lib/intake/heard";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The six things, filling in as somebody talks.
 *
 * This replaces the static prompt pills that sat under the composer. They said
 * the same six things from the first word to the last, so a person who had just
 * spent two minutes describing the worst week of their life got no sign that
 * any of it had landed. These are the same six, read back.
 *
 * Everything about *what* counts as heard lives in lib/intake/heard.ts, which
 * is where the honesty rules are written down. What is decided here is how it
 * behaves on screen, and three of those decisions matter:
 *
 *  · It is announced once, at the end, not as it changes. Six rows ticking
 *    while somebody is speaking would be six interruptions from the screen
 *    reader over the top of their own sentence — and on the recorder path the
 *    text arrives in one lump when the server transcript lands, so it would be
 *    a burst of six. `aria-live` is off while the microphone is open and the
 *    whole panel is announced once, atomically, a beat after it closes.
 *
 *  · The unheard rows are not failures. They carry the same weight as the
 *    heard ones and are marked "not yet" rather than crossed or reddened. A
 *    person who never mentions a UTR because the fraudster used a QR code has
 *    not got anything wrong, and this panel is one of the last things they see
 *    before deciding whether they have said enough.
 *
 *  · Values are shown in full and wrap rather than truncate. A sixteen-digit
 *    reference exists to be checked against a passbook, and an ellipsis in the
 *    middle of one makes it useless for the only thing it is for.
 */

/** How long after the microphone closes before the summary is announced. */
const SETTLE_MS = 1200;

export function HeardSoFar({ text, listening }: { text: string; listening: boolean }) {
  const { t, lang } = useI18n();

  // A plain reading of the committed text, with no memory of earlier readings.
  //
  // An earlier version latched each item on, so nothing could ever un-tick.
  // That guards against speech recognition rewriting its own history — but this
  // panel never sees interim text, only what the composer has committed, and
  // committed text shrinks for exactly one reason: the person edited it. If
  // they delete the amount out of their statement, the amount is genuinely no
  // longer there, and a tick that stayed lit would be claiming we still had it.
  const items = useMemo(() => readHeard(text, lang.code), [text, lang.code]);

  // The announcement waits for the microphone to close and then for the
  // transcript to arrive. Announcing on the listening edge itself fires, on the
  // recorder path, before the words it would be describing exist.
  const [settledAt, setSettledAt] = useState(0);
  useEffect(() => {
    if (listening) return;
    const timer = setTimeout(() => setSettledAt(Date.now()), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [listening, text]);
  const announce = !listening && settledAt > 0;

  const done = items.filter((item) => item.found).length;
  const started = anyHeard(items);

  return (
    <div className="mt-3 border-t border-rule pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-ink-3">{started ? t("heard.title") : t("compose.promptsH")}</p>
        {started && (
          <p className="num text-[0.6875rem] uppercase tracking-wider text-ink-3">
            {t("heard.progress").replace("{n}", String(done)).replace("{total}", String(items.length))}
          </p>
        )}
      </div>

      <ul
        className="mt-2 flex flex-wrap gap-1.5"
        // Off while the words are still arriving; see the note above.
        aria-live={listening ? "off" : "polite"}
        aria-atomic="true"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              item.found
                ? "border-done/35 bg-done-soft text-ink-2"
                // Not a failure state: the same pill it always was, just still
                // waiting. Only the border is lifted, so the eye can find them.
                : "border-rule-strong bg-sunk text-ink-2",
            )}
          >
            {/* An unheard item gets an empty ring, not a transparent tick. The
                glyph used to be rendered either way and hidden with a colour,
                which looks right and copies wrong: selecting the list pasted a
                ✓ in front of every row, including the ones still waiting. */}
            <span
              aria-hidden
              className={cn(
                "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none",
                item.found ? "bg-done text-white" : "border border-rule-strong",
              )}
            >
              {item.found ? "✓" : ""}
            </span>
            <span className="min-w-0">
              <span className={cn(item.found && "text-ink")}>{t(item.label)}</span>
              {/* The screen reader gets the state in words; the tick is
                  decorative and cannot carry it alone. */}
              <span className="sr-only">
                {" — "}
                {item.found ? t("heard.gotIt") : t("heard.toSay")}
              </span>
              {item.value && (
                <span className="num ms-1.5 break-all font-semibold text-ink">{item.value}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Named rather than left as two rows that could never go green. */}
      <p className="mt-2 text-[0.6875rem] leading-[1.45] text-ink-3">{t("heard.later")}</p>

      {started && <p className="mt-1 text-[0.6875rem] leading-[1.45] text-ink-3">{t("heard.check")}</p>}

      {/* One sentence, once, after everything has settled. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce && started
          ? `${t("heard.progress").replace("{n}", String(done)).replace("{total}", String(items.length))}. ${items
              .filter((item) => !item.found)
              .map((item) => t(item.label))
              .join(", ")}`
          : ""}
      </p>
    </div>
  );
}
