"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccountAvatar } from "@/components/auth/AccountAvatar";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import { useActiveCaseId } from "@/lib/case/store";
import { cn } from "@/lib/utils";
import { DEMO_CASE_PATH } from "@/lib/demo/id";

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
  { href: "/compare", key: "nav.compare" },
  { href: "/whatsapp", key: "nav.whatsapp" },
  { href: "/cases", key: "nav.cases" },
  { href: DEMO_CASE_PATH, key: "nav.sample" },
  { href: "#clocks", key: "nav.clocks" },
  { href: "#honesty", key: "nav.honesty" },
  { href: "#faq", key: "nav.faq" },
] as const;

export function Nav() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const caseId = useActiveCaseId();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // A scroll listener fires on every frame to answer one boolean. An observer
    // on a sentinel at the top of the page answers it twice: once when the page
    // leaves the top, once when it comes back. On the cheap phones this is
    // built for, that difference is real.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;height:12px;width:1px;pointer-events:none;";
    document.body.prepend(sentinel);

    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(sentinel);

    return () => {
      io.disconnect();
      sentinel.remove();
    };
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
      // Both cards, not just the desktop one. The phone menu is a separate
      // element, and leaving it out closed the menu on pointerdown — unmounting
      // the link before its click could land, so every item did nothing.
      if (
        menuRef.current?.contains(target)
        || mobileMenuRef.current?.contains(target)
        || buttonRef.current?.contains(target)
      ) return;
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
            "py-3.5 sm:py-2.5 px-0 sm:px-3 rounded-ctl",
            "border-b border-rule last:border-0 sm:border-0",
            "text-[1.0625rem] sm:text-[0.9375rem] font-medium hover:bg-ink/[0.055] hover:text-ink",
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
            "py-3.5 sm:py-2.5 px-0 sm:px-3 sm:rounded-ctl sm:mt-1 sm:border-t sm:border-rule sm:pt-3",
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
    // A floating pill rather than a full-width bar. It matters here beyond
    // looks: the sections below are coloured slabs, and a bar that spanned the
    // window would have to change its own background four times on the way
    // down. A cream pill sits on top of every one of them unchanged.
    <header className="sticky top-0 z-40 px-2 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
      {/* flex-nowrap + shrink-0 everywhere: the row cannot break onto a second
          line at any width, it can only run out of shortcuts to show. */}
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-6xl rounded-card",
          "px-2.5 sm:px-4 h-[60px] sm:h-[64px] flex flex-nowrap items-center gap-1.5 sm:gap-4",
          "bg-paper/85 backdrop-blur-xl transition-[box-shadow,border-color] duration-300",
          scrolled || menu
            ? "border border-ink/20 shadow-[0_10px_34px_-16px_rgba(26,26,26,0.5)]"
            : "border border-ink/10 shadow-[0_4px_18px_-14px_rgba(26,26,26,0.4)]",
        )}
      >
        <div className="shrink-0">
          <Wordmark />
        </div>

        <nav className="hidden lg:flex items-center gap-1 ms-5 xl:ms-7 shrink-0 text-[0.9375rem] text-ink-2">
          {PRIMARY.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="press inline-flex items-center h-11 whitespace-nowrap rounded-ctl px-3 font-medium hover:text-ink hover:bg-ink/[0.055] transition-colors"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex flex-nowrap items-center gap-1 sm:gap-2.5 shrink-0">
          <LanguageSwitcher compact />
          <AccountAvatar />
          <Button href="/start" size="sm" className="shrink-0">{t("nav.start")}</Button>

          <div className="relative shrink-0">
            <button
              ref={buttonRef}
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="site-menu"
              aria-label={t("nav.menu")}
              className={cn(
                "press inline-flex h-10 w-10 items-center justify-center rounded-ctl border transition-colors",
                menu ? "border-ink bg-ink text-paper" : "border-ink/25 bg-transparent hover:border-ink",
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
                className="hidden sm:block absolute end-0 top-full mt-3 w-60 rounded-card border border-ink/20 bg-paper/95 backdrop-blur-xl p-1.5 shadow-[0_18px_50px_-18px_rgba(26,26,26,0.5)] rise"
              >
                {items}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* On a phone it drops in under the pill as a second card — more room for
          a thumb than a 240px menu hung off the button would give. */}
      {menu && (
        <div ref={mobileMenuRef} className="pointer-events-auto sm:hidden mx-auto mt-2 max-w-6xl rounded-card border border-ink/20 bg-paper/95 backdrop-blur-xl shadow-[0_16px_44px_-18px_rgba(26,26,26,0.5)] rise">
          <nav className="px-4 py-1">{items}</nav>
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
