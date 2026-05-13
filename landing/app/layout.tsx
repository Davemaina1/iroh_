import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iroh — Legal intelligence across Africa",
  description:
    "AI-powered legal research across African jurisdictions. Search legislation, case law, and procedure. Cited answers in seconds.",
  openGraph: {
    title: "Iroh — Legal intelligence across Africa",
    description:
      "AI-powered legal research across African jurisdictions. Search legislation, case law, and procedure. Cited answers in seconds.",
    url: "https://iroh.africa",
    siteName: "Iroh",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Iroh — Legal intelligence across Africa",
    description:
      "AI-powered legal research across African jurisdictions. Search legislation, case law, and procedure.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://iroh.africa"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream text-dark antialiased">{children}</body>
    </html>
  );
}
