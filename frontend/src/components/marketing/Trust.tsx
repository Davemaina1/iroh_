"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye } from "lucide-react";

const points = [
  {
    icon: Lock,
    title: "End-to-end encryption",
    desc: "Your queries and documents are encrypted in transit and at rest.",
  },
  {
    icon: Eye,
    title: "No training on your data",
    desc: "Your research is never used to train AI models. Your work stays yours.",
  },
  {
    icon: Shield,
    title: "Kenya DPA 2019 compliant",
    desc: "Built to meet the requirements of the Data Protection Act, 2019.",
  },
];

export default function Trust() {
  return (
    <section className="py-28 px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Enterprise-grade security
          </h2>
          <p className="mt-4 text-dark/50 font-sans text-lg">
            Your research is confidential. We built Iroh to keep it that way.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-dark/5 flex items-center justify-center mx-auto mb-5">
                <p.icon className="w-6 h-6 text-dark/70" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-lg mb-2 font-sans">{p.title}</h3>
              <p className="text-sm text-dark/50 leading-relaxed font-sans">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
