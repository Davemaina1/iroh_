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
    a: "Iroh does not invent citations. Every answer is grounded in the actual text of statutes, judgments, and procedure rules retrieved from our corpus, and each citation is clickable so you can verify the source yourself. The AI may still summarise a provision imperfectly, so we strongly recommend verifying any citation before relying on it in court or in advice to a client.",
  },
  {
    q: "What jurisdictions are available?",
    a: "Kenya is live. We cover the Laws of Kenya, subsidiary legislation, case law from the superior courts and key tribunals, circulars, and the procedure rules that govern daily practice. Rwanda, Ghana, and South Africa are next.",
  },
  {
    q: "Who is this for?",
    a: "Advocates, law firms, in-house counsel, legal researchers, law students, and compliance teams working with African law.",
  },
  {
    q: "How current is the legal data?",
    a: "Iroh's primary retrieval is from a curated Kenya Law corpus, with live fallback to kenyalaw.org for very recent material that may not yet be in the corpus. Always verify on the official source before relying on any output.",
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
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">
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
                <span className="font-medium font-sans">{faq.q}</span>
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
                    <p className="px-6 pb-4 text-sm text-dark/60 leading-relaxed font-sans">
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
