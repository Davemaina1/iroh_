"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Select your jurisdiction",
    desc: "Choose from available African legal systems. Start with Kenya — more coming soon.",
  },
  {
    step: "02",
    title: "Ask your question",
    desc: "Type your legal research question in plain language. No complex query syntax needed.",
  },
  {
    step: "03",
    title: "Get cited answers",
    desc: "Receive precise answers with direct citations to legislation, case law, and procedure.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-4">
          How it works
        </h2>
        <p className="text-center text-dark/60 mb-16 max-w-xl mx-auto">
          From question to cited answer in three steps.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
                <span className="font-serif text-2xl text-gold font-semibold">
                  {s.step}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-dark/60 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
