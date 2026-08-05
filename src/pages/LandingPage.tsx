import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Globe,
  Shield,
  FileText,
  Settings,
  BarChart,
  Zap,
  Code2,
  ArrowRight,
  Check,
  Menu,
  X,
} from 'lucide-react';
import CallWidget from '../components/CallWidget';

/** Seeded homepage demo widget (VAPI assistant: Clicko) */
export const HOMEPAGE_DEMO_WIDGET_ID = '00000000-0000-4000-8000-000000000001';

const features = [
  {
    icon: Globe,
    title: 'Global by default',
    description:
      'Replace expensive international toll-free numbers with browser-based calling that works anywhere.',
  },
  {
    icon: Shield,
    title: 'Anonymous when needed',
    description:
      'Protect caller privacy for support, whistleblower, and sensitive intake flows.',
  },
  {
    icon: FileText,
    title: 'Call recording',
    description:
      'Optional cloud recording with retention for QA, compliance, and coaching.',
  },
  {
    icon: Settings,
    title: 'Embed in minutes',
    description:
      'Drop a widget on your site, share a link, or generate a QR code — no telecom project required.',
  },
  {
    icon: BarChart,
    title: 'Reporting that ships',
    description:
      'See volume, outcomes, and exportable history without stitching three vendors together.',
  },
  {
    icon: Phone,
    title: 'Route your way',
    description:
      'AI assistant, SIP trunk, mobile app, or IP PBX — pick the destination that fits.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Create a free account',
    body: 'Sign up in under a minute. No credit card for the trial.',
  },
  {
    n: '02',
    title: 'Configure your widget',
    body: 'Choose AI, SIP, or app routing and brand the call button.',
  },
  {
    n: '03',
    title: 'Embed & go live',
    body: 'Paste one snippet on your site. Start taking web calls today.',
  },
];

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) => (
  <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-600">{description}</p>
  </div>
);

const LandingPage = () => {
  const [mobileNav, setMobileNav] = useState(false);
  const [demoEngaged, setDemoEngaged] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-white">
              <Phone className="h-4 w-4" />
            </span>
            <span className="text-ink">
              Click2Call<span className="text-signal">.ai</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#demo" className="hover:text-ink transition-colors">
              Live demo
            </a>
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">
              How it works
            </a>
            <Link to="/pricing" className="hover:text-ink transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-muted hover:text-ink px-2"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-signal hover:transition-colors"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-muted hover:bg-surface-strong"
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-ink">
              <a href="#demo" onClick={() => setMobileNav(false)}>
                Live demo
              </a>
              <a href="#features" onClick={() => setMobileNav(false)}>
                Features
              </a>
              <a href="#how-it-works" onClick={() => setMobileNav(false)}>
                How it works
              </a>
              <Link to="/pricing" onClick={() => setMobileNav(false)}>
                Pricing
              </Link>
              <Link to="/login" onClick={() => setMobileNav(false)}>
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileNav(false)}
                className="rounded-xl bg-signal px-4 py-2.5 text-center font-semibold text-white"
              >
                Start free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-ink">
              <Zap className="h-3.5 w-3.5" />
              Web calling · AI routing · No toll-free fees
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              International calls on your website —{' '}
              <span className="text-signal">
                free to start
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Put a click-to-call widget on any page. Visitors talk to your team or AI
              assistant in the browser — no expensive international numbers, no app install.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-ink">
              {[
                'Live AI demo on this page — try it in seconds',
                'Embed snippet or shareable link',
                'Route to AI, SIP, or your mobile app',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-signal hover:transition-colors"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink hover:border-border hover:bg-surface-strong transition-colors"
              >
                <Phone className="h-4 w-4 text-signal" />
                Try the live demo
              </a>
            </div>

            <p className="mt-4 text-xs text-muted">
              No credit card required · Setup in minutes · Cancel anytime
            </p>
          </div>

          {/* Demo panel */}
          <div id="demo" className="relative scroll-mt-24">
            <div className="relative rounded-card border border-border bg-surface p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-signal">
                    Interactive demo
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Hear how callers experience your widget
                  </p>
                </div>
                {demoEngaged && (
                  <span className="hidden rounded-full bg-surface-strong px-2.5 py-1 text-[11px] font-medium text-muted sm:inline">
                    Engaged
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <CallWidget
                  widgetId={HOMEPAGE_DEMO_WIDGET_ID}
                  mode="demo"
                  onCallStart={() => setDemoEngaged(true)}
                  onCallEnd={() => setDemoEngaged(true)}
                />
              </div>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                After the call, grab a free account and embed the same experience on your site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-sm font-medium text-muted">
            Built for teams that need global access without telecom bill shock
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> One-line embed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Worldwide
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> AI or human routing
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Everything you need to take web calls
            </h2>
            <p className="mt-3 text-base text-muted">
              Product-ready calling infrastructure without standing up a contact center stack.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Live in three steps
            </h2>
            <p className="mt-3 text-base text-muted">
              From zero to embedded widget before your coffee cools.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className="relative rounded-card border border-border bg-surface p-6"
              >
                <span className="text-xs font-bold tracking-widest text-signal">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/signup?from=how-it-works"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-signal py-16 sm:py-20">
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready for your own Click2Call widget?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
            You already tried the demo. Create a free account, configure routing, and
            embed it on your site today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup?from=bottom-cta"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-signal shadow-lg hover:bg-white/90 transition-colors"
            >
              Get my free widget
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-signal/10 px-6 py-3 text-sm font-semibold text-white hover:bg-signal/15 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-signal text-white">
              <Phone className="h-3.5 w-3.5" />
            </span>
            Click2Call.ai
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted">
            <Link to="/pricing" className="hover:text-ink">
              Pricing
            </Link>
            <Link to="/login" className="hover:text-ink">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-ink">
              Sign up
            </Link>
            <a href="#demo" className="hover:text-ink">
              Demo
            </a>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Click2Call.ai
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
