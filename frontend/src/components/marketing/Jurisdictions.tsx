"use client";

import { motion } from "framer-motion";

const jurisdictions = [
  { country: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", status: "Live", active: true },
  { country: "Rwanda", flag: "\u{1F1F7}\u{1F1FC}", status: "Coming soon", active: false },
  { country: "South Africa", flag: "\u{1F1FF}\u{1F1E6}", status: "Coming soon", active: false },
  { country: "Ghana", flag: "\u{1F1EC}\u{1F1ED}", status: "Coming soon", active: false },
];

export default function Jurisdictions() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Multi-jurisdiction coverage
          </h2>
          <p className="mt-4 text-dark/50 font-sans text-lg">
            Starting with Kenya. Expanding across the continent.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {jurisdictions.map((j, i) => (
            <motion.div
              key={j.country}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-8 text-center border transition-shadow ${
                j.active
                  ? "bg-white border-gold/20 shadow-xl shadow-gold/10"
                  : "bg-white/60 border-dark/5 opacity-70"
              }`}
            >
              <span className="text-5xl block">{j.flag}</span>
              <p className="mt-4 font-semibold text-lg font-sans">{j.country}</p>
              <span
                className={`mt-2 inline-block text-xs font-medium px-3 py-1 rounded-full ${
                  j.active
                    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                    : "bg-dark/5 text-dark/40"
                }`}
              >
                {j.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
