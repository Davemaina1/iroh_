"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Does Iroh replace a lawyer?",
    a: "No. Iroh is a research tool, not a law firm. It helps legal professionals find relevant law faster, but all legal advice should come from a qualified advocate.",
  },
  {
    q: "Can I trust the citations?",
    a: "Every answer includes direct citations to source documents. You can click through to verify the exact provision. Our retrieval system uses hybrid search (semantic + keyword) with reranking for accuracy.",
  },
  {
    q: "What jurisdictions are available?",
    a: "Kenya is live today with comprehensive coverage of legislation and over 1,000 court judgments. Rwanda, South Africa, and Ghana are in active development.",
  },
  {
    q: "Who is this for?",
    a: "Advocates, law firms, in-house counsel, legal researchers, law students, and compliance teams working with African law.",
  },
  {
    q: "How current is the legal data?",
    a: "Our Kenyan corpus includes legislation and case law up to 2024. We continuously update our databases as new judgments and amendments are published.",
  },
  {
    q: "Is my research data private?",
    a: "Yes. Your queries are not shared with other users or used to train AI models. See our Privacy Policy for full details on data handling under Kenya's Data Protection Act 2019.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-12">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-dark/5 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-cream/50 transition-colors"
              >
                <span className="font-medium">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-dark/40 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-6 pb-4 text-sm text-dark/60 leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
