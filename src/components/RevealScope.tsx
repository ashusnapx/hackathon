"use client";

import { useReveal } from "@/lib/useReveal";

/**
 * Renders nothing. Its only job is to run the page-wide reveal observer from
 * inside a Client Component, so the page itself can stay a Server Component.
 */
export function RevealScope() {
  useReveal();
  return null;
}
