"use client";

import { Headline } from "@/components/ui/Split";
import { useT } from "@/lib/i18n/context";

const STEPS = [
  ["how.s1.t", "how.s1.b", "how.s1.time"],
  ["how.s2.t", "how.s2.b", "how.s2.time"],
  ["how.s3.t", "how.s3.b", "how.s3.time"],
  ["how.s4.t", "how.s4.b", "how.s4.time"],
] as const;

/**
 * Four steps, dealt over each other as you scroll.
 *
 * The reference pins a sequence of cards with ScrollTrigger and stacks them.
 * This is the same effect with `position: sticky` and nothing else: each card
 * sticks under the header, the next one climbs up and covers it, and a sliver
 * of every card already passed stays visible at the top of the pile. No script,
 * no measurement, and it degrades into an ordinary column of cards anywhere
 * sticky is not honoured.
 *
 * It suits this content specifically because the four steps *are* a sequence
 * and each one genuinely supersedes the last. A stack that dealt four unrelated
 * feature cards would just be a trick.
 */
export function How() {
  const t = useT();

  return (
    // No clipping on this panel, deliberately. `overflow-hidden` would make it
    // the scroll container for its descendants and silently disable every
    // `position: sticky` inside it — which is the whole section.
    <section id="how" className="on-dawn panel-full">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[20rem_minmax(0,1fr)] gap-x-16 gap-y-12">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="label">{t("how.kicker")}</p>
            <h2 className="mt-4">
              <Headline>{t("how.h2")}</Headline>
            </h2>
          </div>

          {/* The bottom padding is the runway: without it the last card has
              nothing left to scroll against and the pile never resolves. */}
          <ol className="flex flex-col gap-5 lg:pb-[12vh]">
            {STEPS.map(([title, body, time], i) => (
              <li
                key={title}
                className="stack-item sheet lift p-7 sm:p-10 lg:min-h-[21rem] flex flex-col"
                style={{ "--n": i } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="figure text-[2.5rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="chip px-2.5 py-1 rounded-ctl border border-ink/25 text-ink">
                    {t(time)}
                  </span>
                </div>
                <h3 className="mt-7 max-w-[18ch]">{t(title)}</h3>
                <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-[1.55] text-ink-2">{t(body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
