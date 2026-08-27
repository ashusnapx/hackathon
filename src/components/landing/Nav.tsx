"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/context";
import { activeCaseId } from "@/lib/case/store";
import { cn } from "@/lib/utils";

export function Nav() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  useEffect(() => {
    setCaseId(activeCaseId());
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled ? "bg-paper/92 backdrop-blur-md border-b border-rule" : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-[68px] flex items-center gap-4">
        <Wordmark />

        <nav className="hidden lg:flex items-center gap-7 ms-8 text-[0.9375rem] text-ink-2">
          <a href="#clocks" className="hover:text-ink transition-colors">{t("nav.clocks")}</a>
          <a href="#how" className="hover:text-ink transition-colors">{t("nav.how")}</a>
          <a href="#honesty" className="hover:text-ink transition-colors">{t("nav.honesty")}</a>
          <a href="#faq" className="hover:text-ink transition-colors">{t("nav.faq")}</a>
        </nav>

        <div className="ms-auto flex items-center gap-2.5">
          <LanguageSwitcher compact />
          {caseId ? (
            <Button href={`/case/${caseId}`} size="sm" variant="secondary" className="hidden sm:inline-flex">
              {t("nav.myCase")}
            </Button>
          ) : null}
          <Button href="/start" size="sm">{t("nav.start")}</Button>
        </div>
      </div>
    </header>
  );
}
