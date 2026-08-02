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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <Phone className="h-4 w-4" />
            </span>
            <span className="text-slate-900">
              Click2Call<span className="text-blue-600">.ai</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#demo" className="hover:text-slate-900 transition-colors">
              Live demo
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How it works
            </a>
            <Link to="/pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700 transition-colors"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNav && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-700">
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
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white"
              >
                Start free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/70 via-slate-50 to-slate-50" />
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm backdrop-blur">
              <Zap className="h-3.5 w-3.5" />
              Web calling · AI routing · No toll-free fees
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              International calls on your website —{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                free to start
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Put a click-to-call widget on any page. Visitors talk to your team or AI
              assistant in the browser — no expensive international numbers, no app install.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {[
                'Live AI demo on this page — try it in seconds',
                'Embed snippet or shareable link',
                'Route to AI, SIP, or your mobile app',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                <Phone className="h-4 w-4 text-blue-600" />
                Try the live demo
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              No credit card required · Setup in minutes · Cancel anytime
            </p>
          </div>

          {/* Demo panel */}
          <div id="demo" className="relative scroll-mt-24">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-xl" />
            <div className="relative rounded-3xl border border-slate-200/80 bg-white/70 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Interactive demo
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Hear how callers experience your widget
                  </p>
                </div>
                {demoEngaged && (
                  <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline">
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

              <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                After the call, grab a free account and embed the same experience on your site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-sm font-medium text-slate-500">
            Built for teams that need global access without telecom bill shock
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to take web calls
            </h2>
            <p className="mt-3 text-base text-slate-600">
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
      <section id="how-it-works" className="scroll-mt-20 border-t border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Live in three steps
            </h2>
            <p className="mt-3 text-base text-slate-600">
              From zero to embedded widget before your coffee cools.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-6"
              >
                <span className="text-xs font-bold tracking-widest text-blue-600">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/signup?from=how-it-works"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready for your own Click2Call widget?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-blue-100">
            You already tried the demo. Create a free account, configure routing, and
            embed it on your site today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup?from=bottom-cta"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
            >
              Get my free widget
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <Phone className="h-3.5 w-3.5" />
            </span>
            Click2Call.ai
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
            <Link to="/pricing" className="hover:text-slate-800">
              Pricing
            </Link>
            <Link to="/login" className="hover:text-slate-800">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-slate-800">
              Sign up
            </Link>
            <a href="#demo" className="hover:text-slate-800">
              Demo
            </a>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Click2Call.ai
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
