"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import { activeCaseId } from "@/lib/case/store";
import { cn } from "@/lib/utils";

/**
 * Six inline links plus a wordmark, a language picker and a CTA did not fit
 * between 1024px and roughly 1280px, so the row wrapped onto a second line and
 * the header grew a ragged edge.
 *
 * The bar now carries three shortcuts at most and never wraps — every child is
 * `shrink-0` inside a `flex-nowrap` row. The menu holds the complete list at
 * every width, including the three that are not shortcuts, so nothing on the
 * page is reachable only by scrolling.
 */

/** Shown inline from `lg` up. Three is the ceiling, on purpose. */
const PRIMARY = [
  { href: "#demo", key: "nav.demo" },
  { href: "#how", key: "nav.how" },
  { href: "/check", key: "nav.check" },
] as const;

/** The full index, in the menu at every width. */
const ALL = [
  { href: "#demo", key: "nav.demo" },
  { href: "#how", key: "nav.how" },
  { href: "/check", key: "nav.check" },
  { href: "#clocks", key: "nav.clocks" },
  { href: "#honesty", key: "nav.honesty" },
  { href: "#faq", key: "nav.faq" },
] as const;

export function Nav() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCaseId(activeCaseId());
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

  const items = (
    <>
      {ALL.map((l) => (
        <a
          key={l.href}
          href={l.href}
          onClick={() => setMenu(false)}
          className={cn(
            "flex items-center justify-between gap-4 transition-colors",
            "py-3.5 sm:py-2.5 px-0 sm:px-3 sm:rounded-[3px]",
            "border-b border-rule last:border-0 sm:border-0",
            "text-[1.0625rem] sm:text-[0.9375rem] font-light hover:sm:bg-sunk hover:text-ink",
          )}
        >
          {t(l.key)}
          <Chevron />
        </a>
      ))}
      {caseId && (
        <a
          href={`/case/${caseId}`}
          onClick={() => setMenu(false)}
          className={cn(
            "flex items-center justify-between gap-4 transition-colors",
            "py-3.5 sm:py-2.5 px-0 sm:px-3 sm:rounded-[3px] sm:mt-1 sm:border-t sm:border-rule sm:pt-3",
            "text-[1.0625rem] sm:text-[0.9375rem] font-semibold text-urgent",
          )}
        >
          {t("nav.myCase")}
          <Chevron />
        </a>
      )}
    </>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled || menu
          ? "bg-paper/92 backdrop-blur-md border-b border-rule"
          : "bg-transparent border-b border-transparent",
      )}
    >
      {/* flex-nowrap + shrink-0 everywhere: the row cannot break onto a second
          line at any width, it can only run out of shortcuts to show. */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-[68px] flex flex-nowrap items-center gap-2 sm:gap-4">
        <div className="shrink-0">
          <Wordmark />
        </div>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-7 ms-6 xl:ms-8 shrink-0 text-[0.9375rem] text-ink-2">
          {PRIMARY.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="whitespace-nowrap font-light hover:text-ink transition-colors"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex flex-nowrap items-center gap-1.5 sm:gap-2.5 shrink-0">
          <LanguageSwitcher compact />
          <Button href="/start" size="sm" className="shrink-0">{t("nav.start")}</Button>

          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="site-menu"
              aria-label={t("nav.menu")}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-[3px] border transition-colors",
                menu ? "border-ink bg-sunk" : "border-rule-strong bg-raised hover:border-ink",
              )}
            >
              {menu ? <CloseIcon /> : <MenuIcon />}
            </button>

            {/* From `sm` up the menu is a card hung under its button. It is
                narrow and right-anchored, so it cannot run off the edge. */}
            {menu && (
              <div
                ref={menuRef}
                id="site-menu"
                className="hidden sm:block absolute end-0 top-full mt-2 w-60 sheet p-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] rise"
              >
                {items}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* On a phone it drops in under the bar at full width — more room for a
          thumb than a 240px card would give. */}
      {menu && (
        <div className="sm:hidden border-t border-rule bg-paper">
          <nav className="mx-auto max-w-6xl px-5 py-2">{items}</nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3 shrink-0 rtl:rotate-180" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
