import type { Metadata } from "next";

import { RevealScope } from "@/components/RevealScope";
import { Nav } from "@/components/landing/Nav";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

/**
 * The questions, moved off the landing page.
 *
 * They were the thirteenth band on a page that had grown to thirteen, and an
 * accordion of answers is the least likely thing on a landing page to be opened
 * by somebody deciding whether to trust it — but the most likely thing to be
 * searched for by somebody who already has a question. Its own page serves both
 * better than the bottom of a scroll served either.
 */
export const metadata: Metadata = {
  title: "Questions — Kavach",
  description: "What Kavach is, what it is not, and what happens to your case.",
};

export default function FaqPage() {
  return (
    <>
      <RevealScope />
      <Nav />
      <main id="main">
        <Faq />
      </main>
      <Footer />
    </>
  );
}
