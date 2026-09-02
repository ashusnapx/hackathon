import { RevealScope } from "@/components/RevealScope";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Ticker } from "@/components/landing/Ticker";
import { Problem } from "@/components/landing/Problem";
import { Compare } from "@/components/landing/Compare";
import { Clocks } from "@/components/landing/Clocks";
import { Demo } from "@/components/landing/Demo";
import { How } from "@/components/landing/How";
import { Languages } from "@/components/landing/Languages";
import { Honesty } from "@/components/landing/Honesty";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <RevealScope />
      <Nav />
      <main id="main">
        <Hero />
        <Ticker />
        <Problem />
        <Compare />
        <Demo />
        <Clocks />
        <How />
        <Languages />
        <Honesty />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
