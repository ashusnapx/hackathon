"use client";

import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/constants";
import { Logo } from "@/components/Logo";
import { useState, useEffect } from "react";
import { useLenis } from "lenis/react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    if (!lenis) return;
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      lenis.scrollTo(el, { offset: -80 });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="group">
          <Logo size="md" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollTo(item.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="/report">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              Start Report
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
