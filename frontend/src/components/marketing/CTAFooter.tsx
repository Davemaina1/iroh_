"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTAFooter() {
  return (
    <section className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
          The future of legal research
          <br />
          <span className="text-gold">in Africa starts here.</span>
        </h2>
        <p className="mt-6 text-dark/60 font-sans">
          Join legal professionals already using Iroh to research faster and cite
          with confidence.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="bg-gold text-white px-8 py-3.5 rounded-full font-medium hover:bg-gold/90 transition-colors"
          >
            Try it out
          </Link>
          <Link
            href="/waitlist"
            className="text-sm text-dark/60 hover:text-dark transition-colors"
          >
            Join the waitlist
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
