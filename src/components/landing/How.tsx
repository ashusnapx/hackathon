"use client";

import { useT } from "@/lib/i18n/context";

const STEPS = [
  ["how.s1.t", "how.s1.b", "how.s1.time"],
  ["how.s2.t", "how.s2.b", "how.s2.time"],
  ["how.s3.t", "how.s3.b", "how.s3.time"],
  ["how.s4.t", "how.s4.b", "how.s4.time"],
] as const;

export function How() {
  const t = useT();

  return (
    <section id="how" className="border-t border-rule bg-sunk">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <p className="label">{t("how.kicker")}</p>
        <h2 className="mt-3 max-w-2xl text-4xl sm:text-5xl">{t("how.h2")}</h2>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule">
          {STEPS.map(([title, body, time], i) => (
            <article key={title} className="bg-paper p-6 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="num text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="num text-[0.6875rem] uppercase tracking-wider text-urgent">{t(time)}</span>
              </div>
              <h3 className="mt-5 text-xl leading-snug">{t(title)}</h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.6] text-ink-2">{t(body)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
