"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LANGUAGES, SCRIPT_CLASS } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/context";
import { coverageOf, isTranslated } from "@/lib/i18n/loader";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/useIsClient";

/**
 * The language picker is the first thing a non-English speaker needs and the
 * last thing most Indian government sites give them. So it is always visible,
 * never hidden behind a hamburger, and every option is written in its own
 * script — an exonym list is useless to someone who cannot read English.
 *
 * Two presentations, one list. On a desktop it is a dropdown anchored under the
 * button. On a phone it is a bottom sheet portalled to <body>.
 *
 * The portal is not decoration. This control sits inside a sticky header that
 * uses `backdrop-blur`, and a backdrop-filter makes its element the containing
 * block for any fixed-position descendant — so a sheet rendered in place cannot
 * reliably escape the header. Anchoring it to the button instead was worse: the
 * button sits near the right edge, the panel is wider than the space left of it,
 * and the whole endonym column — the entire point of this control — was being
 * clipped off the left of the screen.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, loading, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // `pointerdown` rather than `mousedown`: it covers touch and pen without
    // waiting for the synthesised mouse event, which some Android WebViews
    // never send at all.
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // Both panels — the desktop dropdown and the phone sheet — are mounted
      // whenever this is open; only one is visible at a given width. They used
      // to share a single ref, so the portal (mounted last) won it and a real
      // click on the desktop dropdown read as "outside": pointerdown closed the
      // panel and the click landed on nothing. Asking the DOM which panel a
      // target sits in cannot go wrong however many panels there are.
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest("[data-lang-panel]")) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);

    // Physical keyboards get search; phones should not get a keyboard thrown at
    // them the moment the sheet opens.
    const desktop = window.matchMedia("(min-width: 640px)").matches;
    if (desktop) searchRef.current?.focus();

    // A bottom sheet over a scrolling page is a rubber-banding mess on iOS.
    const prevOverflow = document.body.style.overflow;
    if (!desktop) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      document.body.style.overflow = prevOverflow;
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

  const choose = (code: string) => {
    setLang(code);
    setOpen(false);
    setQ("");
    buttonRef.current?.focus();
  };

  const list = (
    <>
      <div className="p-3 border-b border-rule shrink-0">
        <p className="label mb-2">{t("lang.choose")}</p>
        <p className="text-sm text-ink-2 leading-snug mb-1 font-light">{t("lang.sub")}</p>
        <p className="text-xs text-ink-3 leading-snug mb-3 font-light">
          Marked <span className="label !tracking-wider">EN</span> are not translated yet and fall
          back to English. Documents can still be translated into any of the 23.
        </p>
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("lang.search")}
          /* 16px minimum, or iOS Safari zooms the whole page on focus. */
          className="w-full h-11 px-3 bg-sunk border border-rule rounded-ctl text-base focus:outline-none focus:border-ink"
        />
      </div>

      <ul className="flex-1 overflow-y-auto overscroll-contain no-bar p-1.5">
        {results.map((l) => {
          const active = l.code === lang.code;
          return (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={active}
                onClick={() => choose(l.code)}
                className={cn(
                  "w-full flex items-baseline gap-3 px-3 py-3 rounded-ctl text-start",
                  "hover:bg-sunk transition-colors",
                  active && "bg-sunk",
                )}
              >
                <span
                  className={cn(
                    "text-[1.0625rem] leading-tight min-w-0 break-words",
                    active ? "font-semibold text-ink" : "font-medium",
                    SCRIPT_CLASS[l.script],
                  )}
                  dir={l.dir}
                >
                  {l.endonym}
                </span>
                <span className="text-sm text-ink-3 ms-auto shrink-0 font-light">{l.english}</span>
                {/* Coverage, stated rather than discovered. A language that is
                    only two-thirds translated shows a mixed interface, and a
                    citizen should be told that before they pick it, not left to
                    wonder whether the button is broken. */}
                {!isTranslated(l.code) ? (
                  <span className="label !tracking-wider shrink-0" title={t("lang.noneTitle")}>
                    EN
                  </span>
                ) : coverageOf(l.code) < 0.95 ? (
                  <span
                    className="label !tracking-wider shrink-0 text-wait"
                    title={t("lang.partialTitle")}
                  >
                    {Math.round(coverageOf(l.code) * 100)}%
                  </span>
                ) : null}
                {active && <CheckIcon />}
              </button>
            </li>
          );
        })}
        {!results.length && (
          <li className="px-3 py-6 text-center text-sm text-ink-3">No match</li>
        )}
      </ul>
    </>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("lang.choose")}
        className={cn(
          "inline-flex items-center gap-2 h-11 rounded-ctl border border-rule-strong bg-raised",
          "hover:border-ink transition-colors text-[0.9375rem]",
          compact ? "px-2 sm:px-3" : "px-3.5",
        )}
      >
        <GlobeIcon />
        <span className={cn("font-medium truncate max-w-[8ch] sm:max-w-none", SCRIPT_CLASS[lang.script])}>
          {lang.endonym}
        </span>
        {loading ? (
          <span className="w-1.5 h-1.5 rounded-full bg-urgent tick" aria-hidden />
        ) : (
          <ChevronIcon className={cn("transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Desktop: a dropdown hung under the button. `max-w` keeps it inside the
          window on a narrow laptop as well. */}
      {open && (
        <div
          data-lang-panel
          role="listbox"
          aria-label={t("lang.choose")}
          className={cn(
            "hidden sm:flex flex-col absolute z-50 mt-2 end-0",
            "w-[26rem] max-w-[calc(100vw-2rem)] max-h-[min(70vh,32rem)]",
            "sheet shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] rise overflow-hidden",
          )}
        >
          {list}
        </div>
      )}

      {/* Phone: a bottom sheet at full width, so no endonym can fall off-screen. */}
      {open && mounted
        ? createPortal(
            <div className="sm:hidden fixed inset-0 z-[90]">
              <div
                className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div
                data-lang-panel
                role="listbox"
                aria-label={t("lang.choose")}
                className={cn(
                  "absolute inset-x-0 bottom-0 flex flex-col",
                  "max-h-[85dvh] bg-raised border-t border-rule rounded-t-xl",
                  "pb-[env(safe-area-inset-bottom)] rise overflow-hidden",
                )}
              >
                <div className="flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
                  <span className="h-1 w-10 rounded-full bg-rule-strong" />
                </div>
                {list}
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 h-12 border-t border-rule text-[0.9375rem] font-medium text-ink-2 hover:text-ink"
                >
                  {t("g.close")}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
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
