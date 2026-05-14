import Nav from "@/components/marketing/Nav";
import Hero from "@/components/marketing/Hero";
import Jurisdictions from "@/components/marketing/Jurisdictions";
import Features from "@/components/marketing/Features";
import HowItWorks from "@/components/marketing/HowItWorks";
import FAQ from "@/components/marketing/FAQ";
import CTAFooter from "@/components/marketing/CTAFooter";
import Footer from "@/components/marketing/Footer";

export default function Home() {
  return (
    <div className="bg-cream text-dark">
      <Nav />
      <main>
        <Hero />
        <Jurisdictions />
        <Features />
        <HowItWorks />
        <FAQ />
        <CTAFooter />
      </main>
      <Footer />
    </div>
  );
}
