import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Jurisdictions from "@/components/Jurisdictions";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import FAQ from "@/components/FAQ";
import CTAFooter from "@/components/CTAFooter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
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
    </>
  );
}
