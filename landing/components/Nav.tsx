"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg
            width="28"
            height="28"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M32 4C28 16 20 24 20 36C20 44 25 52 32 56C32 56 28 48 28 40C28 32 32 24 36 16C40 24 44 32 44 40C44 48 40 56 40 56C47 52 52 44 52 36C52 24 44 16 40 4C38 10 34 14 32 4Z"
              fill="#C4A882"
            />
          </svg>
          <span className="font-serif text-xl font-semibold tracking-tight">
            Iroh
          </span>
        </Link>
        <Link
          href="/signup"
          className="bg-dark text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-dark/90 transition-colors"
        >
          Request early access
        </Link>
      </div>
    </nav>
  );
}
