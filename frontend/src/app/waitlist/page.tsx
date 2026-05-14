"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ name, email, role });

    if (insertError) {
      if (insertError.code === "23505") {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  }

  return (
    <div className="bg-cream text-dark min-h-screen">
      <nav className="border-b border-dark/5 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="font-display text-xl font-semibold">
            Iroh
          </Link>
        </div>
      </nav>
      <main className="max-w-lg mx-auto px-6 py-24">
        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-semibold mb-3">
              You&apos;re on the list.
            </h1>
            <p className="text-dark/60 font-sans">
              We&apos;ll be in touch soon with early access details. Thank you
              for your interest in Iroh.
            </p>
            <Link
              href="/"
              className="mt-8 inline-block text-gold hover:underline font-sans"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold mb-2">
              Join the waitlist
            </h1>
            <p className="text-dark/60 mb-8 font-sans">
              We&apos;re onboarding legal professionals across Africa. Leave your
              details and we&apos;ll be in touch.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1.5 font-sans"
                >
                  Full name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-sans"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5 font-sans"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-sans"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium mb-1.5 font-sans"
                >
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold font-sans"
                >
                  <option value="">Select your role</option>
                  <option value="advocate">Advocate / Lawyer</option>
                  <option value="student">Law Student</option>
                  <option value="firm">Law Firm</option>
                  <option value="in-house">In-House Counsel</option>
                  <option value="academic">Academic / Researcher</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {error && (
                <p className="text-sm text-red-600 font-sans">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dark text-white py-3.5 rounded-full font-medium hover:bg-dark/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                {loading ? "Submitting..." : "Join the waitlist"}
              </button>
              <p className="text-xs text-dark/40 text-center mt-4 font-sans">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
