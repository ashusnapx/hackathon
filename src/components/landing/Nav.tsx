"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import { activeCaseId } from "@/lib/case/store";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/check", key: "nav.check" },
  { href: "#demo", key: "nav.demo" },
  { href: "#clocks", key: "nav.clocks" },
  { href: "#how", key: "nav.how" },
  { href: "#honesty", key: "nav.honesty" },
  { href: "#faq", key: "nav.faq" },
] as const;

export function Nav() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setCaseId(activeCaseId());
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Below lg these links used to be simply `hidden` with nothing in their
  // place, so on a phone there was no way to reach any section of the page
  // except by scrolling the whole thing.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menu]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled || menu
          ? "bg-paper/92 backdrop-blur-md border-b border-rule"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-[68px] flex items-center gap-2 sm:gap-4">
        <Wordmark />

        <nav className="hidden lg:flex items-center gap-7 ms-8 text-[0.9375rem] text-ink-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-light hover:text-ink hover:font-normal transition-colors">
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2.5">
          <LanguageSwitcher compact />
          {caseId ? (
            <Button href={`/case/${caseId}`} size="sm" variant="secondary" className="hidden sm:inline-flex">
              {t("nav.myCase")}
            </Button>
          ) : null}
          <Button href="/start" size="sm">{t("nav.start")}</Button>

          <button
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            aria-label={t("nav.menu")}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-[3px] border border-rule-strong bg-raised hover:border-ink transition-colors"
          >
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menu && (
        <div id="mobile-menu" className="lg:hidden border-t border-rule bg-paper">
          <nav className="mx-auto max-w-6xl px-5 sm:px-8 py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                className="flex items-center justify-between gap-4 py-3.5 border-b border-rule last:border-0 text-[1.0625rem] font-light hover:font-normal transition-all"
              >
                {t(l.key)}
                <ChevronIcon />
              </a>
            ))}
            {caseId && (
              <a
                href={`/case/${caseId}`}
                onClick={() => setMenu(false)}
                className="flex items-center justify-between gap-4 py-3.5 text-[1.0625rem] font-semibold text-urgent"
              >
                {t("nav.myCase")}
                <ChevronIcon />
              </a>
            )}
          </nav>
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

function ChevronIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3 rtl:rotate-180" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
