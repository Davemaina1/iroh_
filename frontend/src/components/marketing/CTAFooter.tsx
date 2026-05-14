"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTAFooter() {
  return (
    <section className="py-32 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="font-display text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
          The future of legal research
          <br />
          <span className="text-gold">in Africa starts here.</span>
        </h2>
        <p className="mt-6 text-dark/50 font-sans text-lg max-w-xl mx-auto">
          Join legal professionals already using Iroh to research faster and
          cite with confidence.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-block bg-gold text-white px-10 py-4 rounded-full font-medium text-lg hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
          >
            Try Iroh free
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
