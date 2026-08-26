import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { SocialProof } from "@/components/sections/SocialProof";
import { FAQ } from "@/components/sections/FAQ";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/sections/Navbar";

export default function Home() {
  return (
    <main className="flex-1">
      <Navbar />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <FAQ />
      <Footer />
    </main>
  );
}
