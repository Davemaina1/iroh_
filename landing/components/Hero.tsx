"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-5xl md:text-7xl font-semibold leading-tight tracking-tight"
        >
          Legal intelligence
          <br />
          <span className="text-gold">across Africa.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg md:text-xl text-dark/70 max-w-2xl mx-auto"
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
            href="/signup"
            className="bg-dark text-white px-8 py-3.5 rounded-full font-medium hover:bg-dark/90 transition-colors"
          >
            Request early access
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
          <div className="bg-dark p-4 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-white/50 text-xs ml-2 font-mono">
              app.iroh.africa
            </span>
          </div>
          <div className="p-8 md:p-12 bg-gradient-to-b from-white to-cream/50">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="bg-cream rounded-xl p-4 text-left">
                <p className="text-sm text-dark/60 mb-1">You asked:</p>
                <p className="font-medium">
                  What are the grounds for judicial review in Kenya?
                </p>
              </div>
              <div className="bg-white border border-gold/20 rounded-xl p-4 text-left">
                <p className="text-sm text-gold mb-1">Iroh:</p>
                <p className="text-sm text-dark/80">
                  Under Kenyan law, judicial review can be sought on three
                  traditional grounds: <strong>illegality</strong>,{" "}
                  <strong>irrationality</strong>, and{" "}
                  <strong>procedural impropriety</strong>...
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-gold/10 text-gold px-2 py-1 rounded">
                    Fair Administrative Action Act, 2015
                  </span>
                  <span className="text-xs bg-gold/10 text-gold px-2 py-1 rounded">
                    Republic v KEBS [2019]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
