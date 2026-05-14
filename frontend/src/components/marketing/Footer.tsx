import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-dark/5 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M32 4C28 16 20 24 20 36C20 44 25 52 32 56C32 56 28 48 28 40C28 32 32 24 36 16C40 24 44 32 44 40C44 48 40 56 40 56C47 52 52 44 52 36C52 24 44 16 40 4C38 10 34 14 32 4Z"
              fill="#C4A882"
            />
          </svg>
          <span className="font-display text-sm font-medium">Iroh</span>
        </div>
        <nav className="flex gap-6 text-sm text-dark/60 font-sans">
          <Link href="/privacy" className="hover:text-dark transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-dark transition-colors">
            Terms of Service
          </Link>
          <a
            href="mailto:david@makini.tech"
            className="hover:text-dark transition-colors"
          >
            Contact
          </a>
        </nav>
        <p className="text-xs text-dark/40 font-sans">
          &copy; {new Date().getFullYear()} Algedi Intelligence Labs Ltd. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
}
