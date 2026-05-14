"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Ask your question",
    desc: "Type your legal research question in plain language. No complex query syntax needed.",
  },
  {
    step: "02",
    title: "AI retrieves the law",
    desc: "Iroh searches across statutes, case law, and procedural rules to find relevant provisions.",
  },
  {
    step: "03",
    title: "Get cited answers",
    desc: "Receive precise answers with direct, clickable citations to the source material.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-dark text-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-white/50 font-sans text-lg">
            From question to cited answer in three steps.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              <span className="font-display text-7xl font-bold text-white/5 absolute -top-6 -left-2">
                {s.step}
              </span>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
                  <span className="font-display text-lg text-gold font-semibold">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-xl mb-3 font-sans">
                  {s.title}
                </h3>
                <p className="text-white/50 leading-relaxed font-sans">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
