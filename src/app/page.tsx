import { RevealScope } from "@/components/RevealScope";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Scale } from "@/components/landing/Scale";
import { Portal } from "@/components/landing/Portal";
import { Moat } from "@/components/landing/Moat";
import { ChapterHead } from "@/components/landing/Chapter";
import { VoiceDemo } from "@/components/landing/VoiceDemo";
import { Demo } from "@/components/landing/Demo";
import { Honesty } from "@/components/landing/Honesty";
import { Footer } from "@/components/landing/Footer";

/**
 * The landing page as one story, on one road.
 *
 * It used to be thirteen sections — hero, ticker, journey, problem, compare,
 * features, demo, voice demo, clocks, how, languages, honesty, questions — each
 * with its own kicker and its own argument, in no stated order. Nothing told a
 * reader whether they were halfway or nearly done, and several of them were
 * making the same point in different type.
 *
 * Six chapters now, numbered, hung off a single rule that runs down the page:
 *
 *   00  the hero, and the deck of what this actually does
 *   01  how big the problem is, in four dated figures
 *   02  what meeting the current system looks like, with its sources
 *   03  the four things we decided early that are hard to bolt on later
 *   04  the proof — one real recorded call and the case it became
 *   05  the line: what is real here, and what is pretend
 *
 * Nothing was thrown away. The language specimen became the closing band of 03
 * and the twenty-three scripts became one of its four numbers; the journey rail
 * and the four "how it works" steps are the hero's poster deck; the ten clocks
 * are the second moat claim; the questions moved to /faq, where somebody who has
 * one will actually look. Each merge removed a heading, not an argument.
 */
export default function HomePage() {
  return (
    <>
      <RevealScope />
      <Nav />
      <main id="main">
        <Hero />
        <Scale />
        <Portal />
        <Moat />

        {/* Chapters four and five are carried by full-bleed slabs that are
            worth more at full width than they would be inside the text
            column, so their headings sit on the road and the panels follow. */}
        <ChapterHead id="proof" n="04" kicker="ch.proof.k" heading="ch.proof.h" lede="ch.proof.b" />
        <VoiceDemo />
        <Demo />

        <ChapterHead id="honesty-head" n="05" kicker="ch.line.k" heading="honesty.h2" lede="honesty.body" />
        <Honesty />
      </main>

      {/*
        A band of the page's own ground between the two dark slabs.
        
        Honesty and the footer are both `on-dark`, both full-bleed, and both the
        same ink. Butted together they read as one continuous black block: the
        honesty section appeared to have no end, and the 4px of kantha stitching
        at the top of the footer was doing all the separating on its own. Every
        other slab on this page is separated by the cream it sits on, so this
        one is too.
      */}
      <div className="h-16 sm:h-24" aria-hidden />

      <Footer />
    </>
  );
}
