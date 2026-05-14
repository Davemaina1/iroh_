import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-dark/5 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/logo/flame-gold.svg"
                alt="Iroh"
                className="h-[20px] w-auto"
              />
              <span className="font-display text-base font-semibold">
                Iroh
              </span>
            </div>
            <p className="text-sm text-dark/40 font-sans max-w-xs">
              AI-powered legal research for African jurisdictions.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-medium text-dark/30 uppercase tracking-wider mb-3 font-sans">
                Product
              </p>
              <nav className="flex flex-col gap-2 text-sm text-dark/60 font-sans">
                <Link
                  href="/login"
                  className="hover:text-dark transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/waitlist"
                  className="hover:text-dark transition-colors"
                >
                  Waitlist
                </Link>
              </nav>
            </div>
            <div>
              <p className="text-xs font-medium text-dark/30 uppercase tracking-wider mb-3 font-sans">
                Legal
              </p>
              <nav className="flex flex-col gap-2 text-sm text-dark/60 font-sans">
                <Link
                  href="/privacy"
                  className="hover:text-dark transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-dark transition-colors"
                >
                  Terms of Service
                </Link>
              </nav>
            </div>
            <div>
              <p className="text-xs font-medium text-dark/30 uppercase tracking-wider mb-3 font-sans">
                Company
              </p>
              <nav className="flex flex-col gap-2 text-sm text-dark/60 font-sans">
                <a
                  href="mailto:david@makini.tech"
                  className="hover:text-dark transition-colors"
                >
                  Contact
                </a>
              </nav>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-dark/5 text-center">
          <p className="text-xs text-dark/30 font-sans">
            &copy; {new Date().getFullYear()} Algedi Intelligence Labs Ltd. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
