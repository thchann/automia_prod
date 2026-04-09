import { useEffect } from "react";
import { Link } from "react-router-dom";

import {
  APP_DISPLAY_NAME,
  BUSINESS_ADDRESS,
  LEGAL_ENTITY_NAME,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "./privacyPolicyConstants";

const sections = [
  { id: "summary", label: "Summary" },
  { id: "collection", label: "What Personal Information we collect" },
  { id: "use", label: "What we do with the information" },
  { id: "disclosure", label: "When we disclose information" },
  { id: "cookies", label: "Cookies and this policy page" },
  { id: "security", label: "Security" },
  { id: "transfers", label: "International transfers" },
  { id: "links", label: "Links to other websites" },
  { id: "choices", label: "Your choices" },
  { id: "access", label: "Accessing and correcting your information" },
  { id: "deletion", label: "Data deletion requests" },
  { id: "retention", label: "Retention" },
  { id: "legal-bases", label: "Legal bases (EEA / UK)" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
] as const;

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = `Privacy Policy | ${APP_DISPLAY_NAME}`;
  }, []);

  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Last updated {PRIVACY_EFFECTIVE_DATE}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="mb-10 text-center text-lg font-medium text-foreground">
          This Privacy Policy explains how {LEGAL_ENTITY_NAME} (“we,” “us”) collects, uses, and shares
          personal information when you use {APP_DISPLAY_NAME}, including Instagram messaging
          automations and integrations.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12 lg:items-start">
          <div className="min-w-0">
            <nav
              aria-label="Table of contents"
              className="mb-8 rounded-lg border border-border bg-muted/30 p-4 lg:hidden"
            >
              <p className="mb-2 font-semibold text-foreground">On this page</p>
              <ol className="max-h-[min(50vh,20rem)] list-decimal space-y-1 overflow-y-auto pl-4 text-sm text-muted-foreground">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-primary hover:underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <section id="summary" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">Summary</h2>
              <p>
                {APP_DISPLAY_NAME} connects to Instagram messaging (Instagram Graph API) via webhooks.
                We receive inbound direct messages (text), and we send replies through the API. Replies
                are generated either in <strong>AI mode</strong> (using OpenAI’s API with conversation
                context and your business instructions) or in <strong>static mode</strong> (a fixed
                message you configure; no AI). We store message content and related lead data in our
                services so you can run your CRM and automations.
              </p>
            </section>

            <section id="collection" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                1. What Personal Information we collect
              </h2>
              <p>
                We collect only what we need to provide the service. Categories include:
              </p>
              <ul>
                <li>
                  <strong>Instagram / Meta identifiers</strong> — e.g. sender ID from webhook
                  payloads (`sender.id`), Instagram-scoped user IDs, Page / Instagram Business ID
                  used for your connected account, and conversation/thread identifiers as needed.
                </li>
                <li>
                  <strong>Instagram messaging content</strong> — inbound message text we receive via
                  webhook events. Our code does not process non-text messages; echo events are
                  ignored. We do not store attachments unless you later add such a product.
                </li>
                <li>
                  <strong>Outbound and stored messages</strong> — text we send as replies and
                  messages we persist in our database (incoming and outgoing), including for
                  conversation history and AI context.
                </li>
                <li>
                  <strong>Profile enrichment (best-effort)</strong> — when we create or update a
                  lead, we may call the Instagram Graph API to fetch public profile fields such as
                  username and display name.
                </li>
                <li>
                  <strong>CRM / lead data</strong> — fields such as `platform_sender_id`, name,
                  Instagram handle, and optional phone, notes, or other fields your product supports.
                </li>
                <li>
                  <strong>Automation configuration</strong> — e.g. response mode (`ai` or
                  `static`), static reply text, and system instructions you provide for DM
                  automations.
                </li>
                <li>
                  <strong>AI mode (OpenAI)</strong> — when you use AI mode, we send OpenAI the new
                  inbound message, up to the last N stored messages for context, and a system
                  prompt that may include your business description, website, and automation
                  instructions.
                </li>
                <li>
                  <strong>Technical and operational data</strong> — IP address, device/browser
                  metadata, and server logs (including webhook delivery and error logs). We may log
                  limited webhook payloads for troubleshooting; we avoid logging sensitive content
                  where feasible.
                </li>
              </ul>
            </section>

            <section id="use" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                2. What we do with the information
              </h2>
              <ul>
                <li>Operate Instagram DM automation (receive, route, and send messages).</li>
                <li>Store conversation history so you can provide context for AI replies and support your team.</li>
                <li>Create and manage leads in your CRM-style experience.</li>
                <li>Enrich leads with profile identifiers (e.g. username) to help you recognize customers.</li>
                <li>Maintain security, prevent abuse, and troubleshoot the service.</li>
                <li>Comply with law and enforce our agreements.</li>
              </ul>
            </section>

            <section id="disclosure" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                3. When we disclose information
              </h2>
              <p>
                We <strong>do not sell</strong> your personal information. We may share information
                with:
              </p>
              <ul>
                <li>
                  <strong>Meta Platforms</strong> — we use Instagram Messaging / Graph APIs and
                  webhooks; data is shared with Meta as part of using their services, subject to
                  Meta’s policies and your app settings.
                </li>
                <li>
                  <strong>OpenAI</strong> — only when you use AI mode, we send message content and
                  limited history plus business context to OpenAI to generate suggested replies.
                </li>
                <li>
                  <strong>Service providers</strong> — e.g. hosting, cloud databases, logging, and
                  email delivery, under contracts that require appropriate safeguards.
                </li>
                <li>
                  <strong>Legal and safety</strong> — if required by law, court order, or
                  governmental request, or to protect rights, safety, and integrity of our service
                  and users.
                </li>
              </ul>
            </section>

            <section id="cookies" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                4. Cookies and this policy page
              </h2>
              <p>
                This <strong>static privacy policy page</strong> does not load analytics or
                advertising trackers, and we do not use analytics cookies on this page. If you use
                other parts of {APP_DISPLAY_NAME} while signed in, your browser may use
                strictly necessary cookies or local storage for session and preferences (for example
                to keep you logged in). Those uses are described in your product experience and are
                separate from this public page.
              </p>
            </section>

            <section id="security" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">5. Security</h2>
              <p>
                We use industry-standard safeguards, including encryption in transit (HTTPS/TLS),
                access controls, and monitoring. No method of transmission or storage is 100%
                secure.
              </p>
            </section>

            <section id="transfers" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                6. International transfers
              </h2>
              <p>
                We may process and store data in the United States and other countries where we or
                our service providers operate. Where we transfer personal data from the EEA, UK, or
                Switzerland, we use appropriate safeguards (such as Standard Contractual Clauses) as
                required by law.
              </p>
            </section>

            <section id="links" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                7. Links to other websites
              </h2>
              <p>
                Our service may link to or reference third-party sites (including Meta). We are not
                responsible for their privacy practices.
              </p>
            </section>

            <section id="choices" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">8. Your choices</h2>
              <p>
                You may disconnect Instagram integrations from your account settings where
                available, and you may contact us to exercise rights available in your jurisdiction
                (access, correction, deletion, objection, restriction, portability).
              </p>
            </section>

            <section id="access" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">
                9. Accessing and correcting your information
              </h2>
              <p>
                You may update certain account information in the product. For other requests,
                contact us at <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
              </p>
            </section>

            <section id="deletion" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">10. Data deletion requests</h2>
              <p>
                You may request deletion of personal data we hold in connection with Instagram
                messaging and {APP_DISPLAY_NAME}.
              </p>
              <p>
                <strong>How to request:</strong> Email{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> with the subject line “Data
                deletion request” and include: (1) your Instagram username and/or sender ID if known,
                (2) the Instagram Business account / Page involved, and (3) the email address on your
                {APP_DISPLAY_NAME} account if you have one.
              </p>
              <p>
                <strong>What we will do:</strong> We will verify your request and delete or
                anonymize the personal data we can reasonably associate with your request within{" "}
                <strong>30 days</strong>, unless a longer period is required by law or a
                legitimate dispute. We may retain certain data where required for legal, security, or
                fraud-prevention purposes; in those cases we will explain the scope of retention.
              </p>
              <p>
                <strong>Product deletion:</strong> If you delete a lead or related records in the
                product, we process deletion in line with our systems. If any related message
                history remains due to technical or operational constraints, contact us at{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> so we can complete the
                request.
              </p>
            </section>

            <section id="retention" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">11. Retention</h2>
              <p>
                We retain lead and message data for as long as your account is active and for a
                reasonable period after you disconnect or delete content, unless a longer retention
                is required for legal, security, or compliance reasons. We do not currently apply an
                automated fixed expiry to all messages in code; retention may evolve as we
                document operational policies.
              </p>
            </section>

            <section id="legal-bases" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">12. Legal bases (EEA / UK)</h2>
              <p>
                Where GDPR / UK GDPR applies, we rely on: performance of a contract (providing
                the service); legitimate interests (e.g. securing and improving the service,
                balanced against your rights); consent where required; and legal obligation where
                applicable.
              </p>
            </section>

            <section id="children" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">13. Children</h2>
              <p>
                {APP_DISPLAY_NAME} is not directed to children under 13. We do not knowingly
                collect personal information from children. If you believe we have, contact us and we
                will delete it.
              </p>
            </section>

            <section id="changes" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">14. Changes to this policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will post the new version on
                this page and update the “Last updated” date.
              </p>
            </section>

            <section id="contact" className="mb-12">
              <h2 className="text-xl font-semibold text-foreground">15. Contact us</h2>
              <p>
                <strong>Controller:</strong> {LEGAL_ENTITY_NAME}
                {BUSINESS_ADDRESS ? (
                  <>
                    <br />
                    {BUSINESS_ADDRESS}
                  </>
                ) : null}
              </p>
              <p>
                <strong>Privacy:</strong>{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
                <br />
                <strong>General support:</strong>{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </p>
            </section>
          </article>
          </div>

          <aside className="hidden text-sm lg:sticky lg:top-8 lg:block">
            <nav aria-label="Table of contents" className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 font-semibold text-foreground">On this page</p>
              <ol className="list-decimal space-y-2 pl-4 text-muted-foreground">
                {sections.map((s) => (
                  <li key={s.id} className="leading-snug">
                    <a href={`#${s.id}`} className="text-primary hover:underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
              <a
                href="#top"
                className="mt-4 inline-block text-primary hover:underline"
              >
                Back to top ↑
              </a>
            </nav>
          </aside>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center">
          <Link
            to="/sign-in"
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign in to {APP_DISPLAY_NAME}
          </Link>
        </div>
      </div>
    </div>
  );
}
