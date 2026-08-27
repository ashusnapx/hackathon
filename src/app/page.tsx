import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { Clocks } from "@/components/landing/Clocks";
import { How } from "@/components/landing/How";
import { Languages } from "@/components/landing/Languages";
import { Honesty } from "@/components/landing/Honesty";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
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
