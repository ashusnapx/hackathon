"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the marketing page, in about thirty lines and no bundle.
 *
 * One IntersectionObserver watches every `[data-reveal]` on the page and marks
 * each element as it arrives, once. No scroll listener, no animation library:
 * a page whose entire argument is that it works on a cheap phone over 2G should
 * not ship thirty kilobytes of JavaScript so that headings can fade in.
 *
 * The hiding is done by CSS gated on `data-reveal-ready`, which this hook sets.
 * Without JavaScript the attribute never lands, nothing is hidden, and the page
 * reads normally. Content that depends on script to become visible is a bug.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;

    // Motion here is decoration, so honour the preference by never starting.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.setAttribute("data-reveal-ready", "");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          io.unobserve(entry.target);
        }
      },
      // Fire a little before the element is fully on screen, so the movement
      // has finished by the time the reader's eye reaches it.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );

    const targets = document.querySelectorAll("[data-reveal]");
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      root.removeAttribute("data-reveal-ready");
    };
  }, []);
}
