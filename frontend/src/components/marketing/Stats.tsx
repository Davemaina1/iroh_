"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "30s", label: "Average time to cited answer" },
  { value: "10,000+", label: "Statutory provisions indexed" },
  { value: "100%", label: "Answers with source citations" },
];

export default function Stats() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-5xl md:text-6xl font-semibold text-dark tracking-tight">
                {s.value}
              </p>
              <p className="mt-3 text-dark/50 text-sm font-sans">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
