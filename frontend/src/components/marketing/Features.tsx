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
    icon: FileText,
    title: "Legal drafting",
    desc: "Generate first drafts of legal documents grounded in actual statutory language.",
  },
  {
    icon: Quote,
    title: "Verified citations",
    desc: "Every answer comes with clickable citations to the exact source provisions.",
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
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4">
          Built for African legal professionals
        </h2>
        <p className="text-center text-dark/60 mb-12 max-w-xl mx-auto font-sans">
          Tools designed for how law is actually practiced across the continent.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-xl border border-dark/5 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all"
            >
              <f.icon className="w-8 h-8 text-gold mb-4" strokeWidth={1.5} />
              <h3 className="font-semibold text-lg mb-2 font-sans">{f.title}</h3>
              <p className="text-sm text-dark/60 leading-relaxed font-sans">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
