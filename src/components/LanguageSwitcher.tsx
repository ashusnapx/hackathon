"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/context";
import { isTranslated } from "@/lib/i18n/loader";
import { cn } from "@/lib/utils";

/**
 * The language picker is the first thing a non-English speaker needs and the
 * last thing most Indian government sites give them. So it is always visible,
 * never hidden behind a hamburger, and every option is written in its own
 * script — an exonym list is useless to someone who cannot read English.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, loading, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    // Physical keyboards get search; phones should not get a keyboard thrown at them.
    if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.english.toLowerCase().includes(needle) ||
        l.endonym.includes(q.trim()) ||
        l.code.includes(needle),
    );
  }, [q]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("lang.choose")}
        className={cn(
          "inline-flex items-center gap-2 h-11 rounded-[3px] border border-rule-strong bg-raised",
          "hover:border-ink transition-colors text-[0.9375rem]",
          compact ? "px-3" : "px-3.5",
        )}
      >
        <GlobeIcon />
        <span className={cn("font-medium", SCRIPT_CLASS[lang.script])}>{lang.endonym}</span>
        {loading ? (
          <span className="w-1.5 h-1.5 rounded-full bg-urgent tick" aria-hidden />
        ) : (
          <ChevronIcon className={cn("transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-2 w-[min(92vw,26rem)] sheet shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] rise",
            "end-0",
          )}
        >
          <div className="p-3 border-b border-rule">
            <p className="label mb-2">{t("lang.choose")}</p>
            <p className="text-sm text-ink-2 leading-snug mb-1">{t("lang.sub")}</p>
            <p className="text-xs text-ink-3 leading-snug mb-3">
              Marked <span className="label !tracking-wider">EN</span> are not translated yet and fall
              back to English. Documents can still be translated into any of the 23.
            </p>
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("lang.search")}
              className="w-full h-10 px-3 bg-sunk border border-rule rounded-[3px] text-[0.9375rem] focus:outline-none focus:border-ink"
            />
          </div>

          <ul className="max-h-[min(60vh,24rem)] overflow-y-auto p-1.5">
            {results.map((l) => {
              const active = l.code === lang.code;
              return (
                <li key={l.code}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "w-full flex items-baseline gap-3 px-3 py-2.5 rounded-[3px] text-start",
                      "hover:bg-sunk transition-colors",
                      active && "bg-sunk",
                    )}
                  >
                    <span
                      className={cn("text-[1.0625rem] leading-tight", SCRIPT_CLASS[l.script])}
                      dir={l.dir}
                    >
                      {l.endonym}
                    </span>
                    <span className="text-sm text-ink-3 ms-auto shrink-0">{l.english}</span>
                    {!isTranslated(l.code) && (
                      <span
                        className="label !tracking-wider shrink-0"
                        title="Interface not yet translated — shows English"
                      >
                        EN
                      </span>
                    )}
                    {active && <CheckIcon />}
                  </button>
                </li>
              );
            })}
            {!results.length && (
              <li className="px-3 py-6 text-center text-sm text-ink-3">No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-urgent shrink-0" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
