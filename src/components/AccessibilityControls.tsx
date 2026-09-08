"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * Reading size and contrast, on the page rather than in a browser menu.
 *
 * The usual objection is that browsers already do this. They do, for somebody
 * on their own laptop who knows where the setting is. The people this is built
 * for are frequently on a borrowed phone, in a browser whose menus are in a
 * language they cannot read, in daylight, with shaking hands, being told to
 * hurry by whoever is defrauding them. GIGW 3.0 asks for the control to be on
 * the page for exactly that reason, and it is one of the few things in this
 * product that costs nothing and helps somebody immediately.
 *
 * Both settings write an attribute on `<html>` and a line in local storage.
 * The CSS does everything else, so there is no second styling path to keep in
 * step and nothing here to go wrong on a page that has not loaded its
 * JavaScript yet — an unset attribute is simply the default design.
 */

const TEXT_KEY = "kavach.a11y.text.v1";
const CONTRAST_KEY = "kavach.a11y.contrast.v1";

type TextSize = "m" | "l" | "xl";

const SIZES: { id: TextSize; label: string }[] = [
  { id: "m", label: "A" },
  { id: "l", label: "A" },
  { id: "xl", label: "A" },
];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // The setting still applies to this page; it just will not be remembered.
  }
}

export function AccessibilityControls() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<TextSize>("m");
  const [high, setHigh] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Deferred: local storage does not exist during the server render, and a
    // synchronous set here would cascade a second render before first paint.
    queueMicrotask(() => {
      const savedText = read(TEXT_KEY);
      const savedContrast = read(CONTRAST_KEY);
      if (savedText === "l" || savedText === "xl") setText(savedText);
      if (savedContrast === "high") setHigh(true);
    });
  }, []);

  // The element, not a wrapper: the CSS keys off `:root`, so the setting
  // survives every route change without this component remounting anything.
  useEffect(() => {
    const root = document.documentElement;
    if (text === "m") root.removeAttribute("data-text");
    else root.setAttribute("data-text", text);
    write(TEXT_KEY, text === "m" ? null : text);
  }, [text]);

  useEffect(() => {
    const root = document.documentElement;
    if (high) root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");
    write(CONTRAST_KEY, high ? "high" : null);
  }, [high]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label={t("a11y.title")}
        title={t("a11y.title")}
        className={cn(
          "press inline-flex h-11 w-11 items-center justify-center rounded-ctl border transition-colors",
          open ? "border-ink bg-ink text-paper" : "border-rule-strong bg-transparent hover:border-ink",
        )}
      >
        {/* The international access symbol, drawn rather than loaded: it is the
            one icon here that people actively look for. */}
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="4.2" r="1.8" fill="currentColor" stroke="none" />
          <path d="M5.5 8.2c2.1.7 4.3 1.05 6.5 1.05s4.4-.35 6.5-1.05" />
          <path d="M12 9.25v4.4m0 0 3.2 6.6m-3.2-6.6-3.2 6.6" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          className="absolute end-0 top-full z-50 mt-3 w-72 rounded-card border border-ink/20 bg-paper/97 p-4 shadow-[0_18px_50px_-18px_rgba(26,26,26,0.5)] backdrop-blur-xl rise"
        >
          <p className="label">{t("a11y.textSize")}</p>
          <div role="group" aria-label={t("a11y.textSize")} className="mt-2 grid grid-cols-3 gap-1.5">
            {SIZES.map((size, index) => (
              <button
                key={size.id}
                onClick={() => setText(size.id)}
                aria-pressed={text === size.id}
                className={cn(
                  "flex h-11 items-center justify-center rounded-ctl border font-semibold transition-colors",
                  text === size.id ? "border-ink bg-ink text-paper" : "border-rule-strong hover:border-ink",
                )}
                style={{ fontSize: `${0.875 + index * 0.25}rem` }}
              >
                {size.label}
                <span className="sr-only">
                  {" "}
                  {t(size.id === "m" ? "a11y.sizeM" : size.id === "l" ? "a11y.sizeL" : "a11y.sizeXl")}
                </span>
              </button>
            ))}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={high}
              onChange={(event) => setHigh(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--ink)]"
            />
            <span>
              <span className="block text-[0.9375rem] font-medium leading-snug">{t("a11y.contrast")}</span>
              <span className="mt-0.5 block text-sm leading-[1.5] text-ink-3">{t("a11y.contrastNote")}</span>
            </span>
          </label>

          <p className="mt-4 border-t border-rule pt-3 text-xs leading-[1.55] text-ink-3">
            {t("a11y.motion")}
          </p>
        </div>
      )}
    </div>
  );
}
