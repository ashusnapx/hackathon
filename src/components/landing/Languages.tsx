"use client";

import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/context";
import { isTranslated } from "@/lib/i18n/loader";
import { Headline } from "@/components/ui/Split";
import { cn } from "@/lib/utils";

/**
 * The languages are shown as a specimen sheet — every one set in its own script,
 * at a size where you can actually see the letterforms. Listing "Tamil" in Latin
 * type proves nothing; setting தமிழ் proves the font pipeline works.
 */
export function Languages() {
  const { lang, setLang, t } = useI18n();

  return (
    <section id="languages" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-[23rem_minmax(0,1fr)] gap-x-16 gap-y-12">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2>
              <Headline>{t("langs.h2")}</Headline>
            </h2>
            <p
              className="mt-7 text-[1.0625rem] leading-[1.55] text-ink-2"
              data-reveal
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {t("langs.body")}
            </p>
            <p className="mt-8 num text-sm text-ink-3">
              {t("langs.count")} · {t("langs.try")} →
            </p>
            <p className="mt-3 text-sm leading-snug text-ink-3 max-w-sm">{t("langs.coverage")}</p>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-rule border border-rule rounded-card overflow-hidden self-start">
            {LANGUAGES.map((l) => {
              const active = l.code === lang.code;
              return (
                <li key={l.code}>
                  <button
                    onClick={() => setLang(l.code)}
                    aria-pressed={active}
                    className={cn(
                      "w-full h-full text-start px-4 py-4 transition-colors",
                      active ? "bg-ink text-paper" : "bg-paper hover:bg-ink/[0.05]",
                    )}
                  >
                    <span
                      dir={l.dir}
                      className={cn("block text-[1.3125rem] leading-tight truncate", SCRIPT_CLASS[l.script])}
                    >
                      {l.endonym}
                    </span>
                    <span className={cn("block mt-1 text-xs truncate", active ? "text-paper/60" : "text-ink-3")}>
                      {l.english}
                      {!isTranslated(l.code) && <span className="ms-1.5 opacity-60">· EN</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {/* Twenty-three tiles never fill the last row — two columns leaves
                one gap, three columns leaves one gap. The grid paints its own
                gutters, so an unfilled cell shows as a grey block rather than
                as nothing. One filler closes it at both widths. */}
            <li className="bg-paper" aria-hidden />
          </ul>
        </div>
      </div>
    </section>
  );
}
