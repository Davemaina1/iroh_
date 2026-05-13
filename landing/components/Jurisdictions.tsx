"use client";

import { motion } from "framer-motion";

const jurisdictions = [
  { country: "Kenya", flag: "🇰🇪", status: "Live", active: true },
  { country: "Rwanda", flag: "🇷🇼", status: "Coming soon", active: false },
  { country: "South Africa", flag: "🇿🇦", status: "Coming soon", active: false },
  { country: "Ghana", flag: "🇬🇭", status: "Coming soon", active: false },
];

export default function Jurisdictions() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-4">
          Multi-jurisdiction coverage
        </h2>
        <p className="text-center text-dark/60 mb-12 max-w-xl mx-auto">
          Starting with Kenya, expanding across the continent.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {jurisdictions.map((j, i) => (
            <motion.div
              key={j.country}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl p-6 text-center border ${
                j.active
                  ? "bg-white border-gold/30 shadow-lg shadow-gold/5"
                  : "bg-white/50 border-dark/5"
              }`}
            >
              <span className="text-4xl">{j.flag}</span>
              <p className="mt-3 font-medium">{j.country}</p>
              <span
                className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${
                  j.active
                    ? "bg-green-100 text-green-700"
                    : "bg-dark/5 text-dark/50"
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
