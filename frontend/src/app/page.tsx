import Nav from "@/components/marketing/Nav";
import Hero from "@/components/marketing/Hero";
import Stats from "@/components/marketing/Stats";
import Features from "@/components/marketing/Features";
import Jurisdictions from "@/components/marketing/Jurisdictions";
import HowItWorks from "@/components/marketing/HowItWorks";
import Trust from "@/components/marketing/Trust";
import FAQ from "@/components/marketing/FAQ";
import CTAFooter from "@/components/marketing/CTAFooter";
import Footer from "@/components/marketing/Footer";

export default function Home() {
  return (
    <div className="bg-cream text-dark">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Jurisdictions />
        <HowItWorks />
        <Trust />
        <FAQ />
        <CTAFooter />
      </main>
      <Footer />
    </div>
  );
}
