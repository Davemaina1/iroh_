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
        <h2 className="font-serif text-3xl md:text-5xl font-semibold leading-tight">
          The future of legal research
          <br />
          <span className="text-gold">in Africa starts here.</span>
        </h2>
        <p className="mt-6 text-dark/60">
          Join legal professionals already using Iroh to research faster and cite
          with confidence.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block bg-dark text-white px-8 py-3.5 rounded-full font-medium hover:bg-dark/90 transition-colors"
        >
          Request early access
        </Link>
      </motion.div>
    </section>
  );
}
