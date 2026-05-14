"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-dark overflow-hidden">
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,168,130,0.15)_0%,_transparent_60%)]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-32 pb-12">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-gold/80 text-sm font-medium tracking-widest uppercase mb-6 font-sans"
        >
          Legal Intelligence for Africa
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-8xl font-semibold leading-[0.95] tracking-tight text-white"
        >
          Research that moves
          <br />
          at the speed of{" "}
          <span className="text-gold">practice.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-sans leading-relaxed"
        >
          Search legislation, case law, and procedure across African
          jurisdictions. Cited answers in seconds, not hours.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10"
        >
          <Link
            href="/login"
            className="inline-block bg-gold text-white px-10 py-4 rounded-full font-medium text-lg hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
          >
            Try Iroh free
          </Link>
        </motion.div>
      </div>

      {/* Floating product screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-20"
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_100px_-20px_rgba(196,168,130,0.2)]">
          <Image
            src="/product-screenshot.png"
            alt="Iroh legal research interface"
            width={1400}
            height={900}
            className="w-full h-auto"
            priority
          />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
        </div>
      </motion.div>

      {/* Fade to cream */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream to-transparent" />
    </section>
  );
}
