import React from 'react';
import { Link } from 'react-router-dom';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-xl">
    <h2 className="text-h3 font-semibold text-ink">{title}</h2>
    <div className="mt-sm space-y-sm text-body leading-relaxed text-muted">{children}</div>
  </section>
);

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface px-4 py-xl sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-signal">
          <Link to="/" className="hover:text-signal/80">Click2Call.ai</Link>
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-sm text-sm text-muted">Last updated: August 9, 2026</p>

        <Section title="Agreement">
          <p>
            These terms govern your use of click2call.ai (&quot;click2call&quot;, &quot;we&quot;) — our
            click-to-call widget, dashboard, mobile app, and integrations, including our HighLevel
            marketplace app. By creating an account or installing our app, you agree to these terms.
          </p>
        </Section>

        <Section title="The service">
          <p>
            click2call lets you embed a click-to-call widget on a website. Calls are answered by an AI
            assistant, routed to a phone number or your own call backend, or taken as a voicemail, depending
            on how you configure each widget. Paid plans include a monthly call-minute allowance and
            additional features such as call recording and CRM integrations.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You&apos;re responsible for the accuracy of the information you provide and for keeping your
            account credentials secure. If your account is created via a third-party connection (e.g.
            installing our HighLevel app), that provider&apos;s own terms also apply to your use of their
            platform.
          </p>
        </Section>

        <Section title="Acceptable use">
          <ul className="list-disc space-y-xs pl-lg">
            <li>Don&apos;t use click2call to place calls you don&apos;t have a lawful basis to make, or to harass, defraud, or deceive callers.</li>
            <li>Don&apos;t attempt to disrupt, reverse-engineer, or exceed the intended usage of the service or its APIs.</li>
            <li>You&apos;re responsible for complying with applicable call-recording consent and telemarketing laws in the jurisdictions where you operate.</li>
          </ul>
        </Section>

        <Section title="Third-party integrations">
          <p>
            Features that connect to a third-party service — a CRM like HighLevel, your own VAPI or Twilio
            account, or a payment processor — are provided as a convenience. We&apos;re not responsible for
            the availability, accuracy, or conduct of those third-party services, and your use of them is
            subject to their own terms.
          </p>
        </Section>

        <Section title="Billing">
          <p>
            Paid plans are billed in advance on a recurring basis through Stripe. Usage beyond your plan&apos;s
            call-minute allowance may be limited or metered as described on our pricing page. You can cancel
            at any time from your billing settings; cancellation takes effect at the end of the current
            billing period.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using click2call and delete your account at any time. We may suspend or terminate
            accounts that violate these terms or that we reasonably believe pose a security or legal risk to
            the service or other users.
          </p>
        </Section>

        <Section title="Disclaimer and liability">
          <p>
            click2call is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
            permitted by law, we are not liable for indirect, incidental, or consequential damages arising
            from your use of the service, including missed or misrouted calls.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about these terms: <a className="text-signal hover:text-signal/80" href="mailto:support@click2call.ai">support@click2call.ai</a></p>
        </Section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
