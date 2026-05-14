"use client";

import { motion } from "framer-motion";
import {
  Search,
  FileText,
  Quote,
  Globe,
  LayoutTemplate,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI-powered research",
    desc: "Ask questions in plain English. Get precise, contextual answers from legislation and case law.",
  },
  {
    icon: Quote,
    title: "Verified citations",
    desc: "Every answer comes with clickable citations to the exact source provisions. No hallucinated references.",
  },
  {
    icon: FileText,
    title: "Legal drafting",
    desc: "Generate first drafts of legal documents grounded in actual statutory language and precedent.",
  },
  {
    icon: Globe,
    title: "Multi-jurisdiction",
    desc: "Research across multiple African legal systems from a single interface.",
  },
  {
    icon: LayoutTemplate,
    title: "Document templates",
    desc: "Access jurisdiction-specific templates for common legal documents and filings.",
  },
  {
    icon: Zap,
    title: "Seconds, not hours",
    desc: "Find answers that would take hours of manual research in under 30 seconds.",
  },
];

export default function Features() {
  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Built for African
            <br />
            legal professionals
          </h2>
          <p className="mt-4 text-dark/50 max-w-lg mx-auto font-sans text-lg">
            Tools designed for how law is actually practiced across the
            continent.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-dark/5 rounded-2xl overflow-hidden border border-dark/5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="bg-white p-8 md:p-10 group hover:bg-cream/30 transition-colors"
            >
              <f.icon
                className="w-9 h-9 text-gold mb-5"
                strokeWidth={1.5}
              />
              <h3 className="font-semibold text-lg mb-2 font-sans">
                {f.title}
              </h3>
              <p className="text-sm text-dark/55 leading-relaxed font-sans">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
