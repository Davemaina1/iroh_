import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Iroh",
  description: "How Iroh collects, uses, and protects your personal data.",
};

export default function PrivacyPolicy() {
  return (
    <>
      <nav className="border-b border-dark/5 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="font-serif text-xl font-semibold">
            Iroh
          </Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold mb-2">
          Privacy Policy
        </h1>
        <p className="text-dark/50 mb-12">Effective: 14 May 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-dark/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              1. Who we are
            </h2>
            <p>
              Iroh is operated by <strong>Algedi Intelligence Labs Ltd</strong>,
              a company incorporated in Kenya (BRS ref PVT-9XUK3RLY). Our
              registered address is in Nairobi, Kenya. For data protection
              enquiries, contact us at{" "}
              <a
                href="mailto:david@makini.tech"
                className="text-gold hover:underline"
              >
                david@makini.tech
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              2. Data we collect
            </h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Account information:</strong> name, email address, and
                professional role provided at signup.
              </li>
              <li>
                <strong>Usage data:</strong> queries entered into the platform,
                search history, and interaction patterns.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, device
                information, and access timestamps.
              </li>
              <li>
                <strong>Analytics data:</strong> aggregated usage statistics
                collected via privacy-respecting analytics.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              3. How we use your data
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and improve the Iroh legal research service.</li>
              <li>
                To communicate with you about your account, service updates, and
                product announcements.
              </li>
              <li>
                To analyse usage patterns and improve the accuracy of our legal
                research tools.
              </li>
              <li>To comply with legal obligations under Kenyan law.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell your personal data to third
              parties. We do not use your queries to train AI models.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              4. Data storage and security
            </h2>
            <p>
              Your data is stored on servers operated by our infrastructure
              providers in the European Union (Hetzner) and the United States
              (Render). We employ industry-standard encryption in transit
              (TLS 1.3) and at rest. Access to personal data is restricted to
              authorised personnel on a need-to-know basis.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              5. Your rights under the Kenya Data Protection Act 2019
            </h2>
            <p>
              Under the Data Protection Act, 2019 (No. 24 of 2019), you have the
              right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Access the personal data we hold about you and request a copy.
              </li>
              <li>
                Rectification of inaccurate or incomplete personal data.
              </li>
              <li>
                Erasure of your personal data where there is no compelling reason
                for its continued processing.
              </li>
              <li>Object to or restrict the processing of your personal data.</li>
              <li>Data portability in a commonly used, machine-readable format.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:david@makini.tech"
                className="text-gold hover:underline"
              >
                david@makini.tech
              </a>
              . We will respond within 30 days. You also have the right to lodge
              a complaint with the Office of the Data Protection Commissioner of
              Kenya.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              6. Cookies
            </h2>
            <p>
              Iroh uses strictly necessary cookies for session management. We use
              privacy-respecting analytics that do not require cookie consent
              banners under Kenyan law. We do not use third-party advertising
              cookies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              7. Third-party services
            </h2>
            <p>
              We use the following third-party services in delivering Iroh:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Anthropic (Claude API):</strong> AI language model for
                generating research responses.
              </li>
              <li>
                <strong>Hetzner (EU):</strong> Vector database and embedding
                infrastructure.
              </li>
              <li>
                <strong>Render (US):</strong> Application hosting and backend
                services.
              </li>
            </ul>
            <p className="mt-3">
              Each provider is bound by their own privacy policies and our data
              processing agreements.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              8. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be communicated via email or a notice on our platform.
              Continued use of Iroh after changes constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-dark mb-3">
              9. Contact
            </h2>
            <p>
              For any questions regarding this Privacy Policy or your personal
              data, contact:
            </p>
            <p className="mt-2">
              Algedi Intelligence Labs Ltd
              <br />
              Email:{" "}
              <a
                href="mailto:david@makini.tech"
                className="text-gold hover:underline"
              >
                david@makini.tech
              </a>
              <br />
              Nairobi, Kenya
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
