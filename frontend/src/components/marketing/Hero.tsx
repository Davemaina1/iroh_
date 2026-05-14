"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-5xl md:text-7xl font-semibold leading-tight tracking-tight"
        >
          Legal intelligence
          <br />
          <span className="text-gold">across Africa.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg md:text-xl text-dark/70 max-w-2xl mx-auto font-sans"
        >
          Search legislation, case law, and procedure across African
          jurisdictions. Get cited answers in seconds, not hours.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/login"
            className="bg-gold text-white px-8 py-3.5 rounded-full font-medium hover:bg-gold/90 transition-colors"
          >
            Try it out
          </Link>
          <a
            href="#how-it-works"
            className="border border-dark/20 px-8 py-3.5 rounded-full font-medium hover:bg-dark/5 transition-colors"
          >
            See how it works
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 rounded-2xl border border-gold/20 bg-white shadow-2xl shadow-gold/5 overflow-hidden"
        >
          <Image
            src="/product-screenshot.png"
            alt="Iroh legal research interface"
            width={1200}
            height={800}
            className="rounded-2xl"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}
