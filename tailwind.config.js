/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Dark mode is class-driven so it can be toggled explicitly in addition to
  // following prefers-color-scheme (see src/index.css + docs/design-tokens.md
  // for the full mechanism and the dashboard-dark / marketing-light default rule).
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // font-sans is the app-wide default per DESIGN.md (body/UI = Schibsted Grotesk).
        sans: ['"Schibsted Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        signal: {
          DEFAULT: 'var(--color-signal)',
          hover: 'var(--color-signal-hover)',
        },
        live: {
          DEFAULT: 'var(--color-live)',
          soft: 'var(--color-live-soft)',
        },
        paper: 'var(--color-paper)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          strong: 'var(--color-surface-strong)',
        },
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      // Minor Third (1.2) scale from DESIGN.md > Typography.
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1.4' }], // 12px
        label: ['0.8125rem', { lineHeight: '1.4' }], // 13px
        body: ['0.9375rem', { lineHeight: '1.6' }], // 15px
        lede: ['1.125rem', { lineHeight: '1.5' }], // 18px
        h3: ['1.5rem', { lineHeight: '1.3' }], // 24px
        h2: ['1.875rem', { lineHeight: '1.25' }], // 30px
        h1: ['2.5rem', { lineHeight: '1.15' }], // 40px
        display: ['4rem', { lineHeight: '1.05' }], // 64px
      },
      // 4px base spacing scale from DESIGN.md > Spacing.
      spacing: {
        '2xs': '2px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      // Radius discipline from DESIGN.md > Layout: no uniform rounding everywhere.
      borderRadius: {
        control: '4px', // buttons, inputs, small controls
        card: '10px', // cards, panels
        widget: '16px', // widget panel
        // 'full' (pills, call/status controls) already covered by Tailwind's default `rounded-full`.
      },
      maxWidth: {
        content: '1180px',
      },
      // Motion tokens from DESIGN.md > Motion.
      transitionDuration: {
        micro: '100ms',
        short: '200ms',
        medium: '325ms',
        long: '550ms',
      },
      transitionTimingFunction: {
        enter: 'ease-out',
        exit: 'ease-in',
        move: 'ease-in-out',
      },
    },
  },
  plugins: [],
};
