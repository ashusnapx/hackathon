"use client";

import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/context";
import { isTranslated } from "@/lib/i18n/loader";
import { cn } from "@/lib/utils";

/**
 * The languages are shown as a specimen sheet — every one set in its own script,
 * at a size where you can actually see the letterforms. Listing "Tamil" in Latin
 * type proves nothing; setting தமிழ் proves the font pipeline works.
 */
export function Languages() {
  const { lang, setLang, t } = useI18n();

  return (
    <section id="languages" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-18 sm:py-24">
        <div className="grid lg:grid-cols-[24rem_minmax(0,1fr)] gap-x-16 gap-y-10">
          <div>
            <p className="label">{t("langs.kicker")}</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{t("langs.h2")}</h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.7] text-ink-2">{t("langs.body")}</p>
            <p className="mt-7 num text-sm text-ink-3">
              {t("langs.count")} · {t("langs.try")} →
            </p>
            <p className="mt-3 text-sm leading-snug text-ink-3 max-w-sm">
              The interface itself is hand-translated into English, Hindi, Marathi and Kannada.
              The remaining nineteen fall back to English in the interface — they are marked in
              the picker — while the documents Kavach writes can be translated into any of the 23.
            </p>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-rule border border-rule self-start">
            {LANGUAGES.map((l) => {
              const active = l.code === lang.code;
              return (
                <li key={l.code}>
                  <button
                    onClick={() => setLang(l.code)}
                    aria-pressed={active}
                    className={cn(
                      "w-full h-full text-start px-4 py-3.5 transition-colors",
                      active ? "bg-ink text-paper" : "bg-paper hover:bg-sunk",
                    )}
                  >
                    <span
                      dir={l.dir}
                      className={cn("block text-lg leading-tight truncate", SCRIPT_CLASS[l.script])}
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
          </ul>
        </div>
      </div>
    </section>
  );
}
