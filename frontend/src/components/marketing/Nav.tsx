"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full bg-dark/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo/flame-gold.svg"
            alt="Iroh"
            className="h-[24px] w-auto"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Iroh
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="bg-gold text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gold/90 transition-colors"
          >
            Try Iroh free
          </Link>
        </div>
      </div>
    </nav>
  );
}
