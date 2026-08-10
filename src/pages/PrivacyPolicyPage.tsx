import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-xl">
    <h2 className="text-h3 font-semibold text-ink">{title}</h2>
    <div className="mt-sm space-y-sm text-body leading-relaxed text-muted">{children}</div>
  </section>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface px-4 py-xl sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-signal">
          <Link to="/" className="hover:text-signal/80">Click2Call.ai</Link>
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-sm text-sm text-muted">Last updated: August 9, 2026</p>

        <Section title="What this covers">
          <p>
            This policy describes how click2call.ai (&quot;click2call&quot;, &quot;we&quot;) collects, uses,
            and shares information when you use our click-to-call widget, dashboard, mobile app, and
            related services, including when you connect a third-party CRM such as HighLevel.
          </p>
        </Section>

        <Section title="Information we collect">
          <p><strong className="text-ink">Account information.</strong> Email address and, for password-based accounts, a hashed password. If your account is created through a third-party OAuth connection (e.g. installing our HighLevel app), we receive the email address and business details that provider makes available to us.</p>
          <p><strong className="text-ink">Call data.</strong> When a call is placed through a click2call widget, we process the caller&apos;s audio in real time, and — depending on the widget owner&apos;s settings — may store a recording and transcript, call duration, and outcome.</p>
          <p><strong className="text-ink">Lead information.</strong> Name, email, phone number, and message content a caller provides during a call, along with an AI-generated intent score.</p>
          <p><strong className="text-ink">Widget configuration.</strong> Business name, routing rules, and third-party credentials you provide to connect a call backend (e.g. a VAPI or Twilio account) or a CRM connection (e.g. HighLevel).</p>
          <p><strong className="text-ink">Billing information.</strong> Handled by Stripe; we store a reference to your Stripe customer and subscription, not your card details.</p>
          <p><strong className="text-ink">Usage data.</strong> Standard technical logs (IP address, browser, timestamps) for security and reliability.</p>
        </Section>

        <Section title="How we use information">
          <ul className="list-disc space-y-xs pl-lg">
            <li>To operate the click-to-call widget and route calls according to your configuration.</li>
            <li>To transcribe calls and capture lead details when a widget owner has enabled that feature.</li>
            <li>To push lead and call data into a CRM you&apos;ve explicitly connected (e.g. creating a Contact, Opportunity, or Conversation message in HighLevel).</li>
            <li>To bill for paid plans and enforce usage allowances.</li>
            <li>To provide customer support and maintain the security of the service.</li>
          </ul>
        </Section>

        <Section title="Who we share information with">
          <p>We share information with the service providers (&quot;subprocessors&quot;) needed to run click2call, and only for that purpose:</p>
          <ul className="list-disc space-y-xs pl-lg">
            <li><strong className="text-ink">Supabase</strong> — database, authentication, and file storage.</li>
            <li><strong className="text-ink">VAPI</strong> — AI voice call handling and transcription for AI-answered widgets.</li>
            <li><strong className="text-ink">Twilio</strong> — telephony/SIP routing for widgets configured to use it.</li>
            <li><strong className="text-ink">Stripe</strong> — billing and payment processing.</li>
            <li><strong className="text-ink">HighLevel (LeadConnector)</strong> — only if you explicitly connect an account, to push leads, transcripts, and contact updates into your CRM.</li>
            <li><strong className="text-ink">Cloudflare</strong> — bot protection (Turnstile) and network delivery.</li>
          </ul>
          <p>We do not sell personal information.</p>
        </Section>

        <Section title="Data retention">
          <p>
            Call recordings and transcripts are retained according to your plan&apos;s retention period, after
            which they are deleted. Lead and account records are retained for as long as your account is
            active, or as needed to comply with legal obligations.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can request access to, correction of, or deletion of your data, and disconnect a connected
            CRM at any time from your account settings. Contact us using the details below to exercise these
            rights.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy: <a className="text-signal hover:text-signal/80" href="mailto:privacy@click2call.ai">privacy@click2call.ai</a></p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
