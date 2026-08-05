# Design Tokens — "The Exchange"

This is the foundation layer for click2call's design system. It implements
every token defined in `DESIGN.md` as CSS custom properties, Tailwind
classes, and an Ant Design v5 theme config — but it does **not** migrate any
page markup. That's the follow-up pass; see "Follow-up scope" at the bottom.

Source of truth: `DESIGN.md`. If this file and `DESIGN.md` ever disagree,
`DESIGN.md` wins and this file is stale.

## Files created/changed in this pass

| File | Purpose |
|---|---|
| `index.html` | Google Fonts `<link>` tags (Fraunces, Schibsted Grotesk, IBM Plex Mono) with `preconnect` |
| `src/index.css` | CSS custom properties for the full color palette (light + dark), `body` base styles, `tabular-nums` for mono |
| `tailwind.config.js` | `fontFamily`, semantic `colors`, `fontSize` scale, `spacing` scale, `borderRadius`, `maxWidth`, `darkMode: 'class'`, motion tokens |
| `src/theme/antdTheme.ts` | Ant Design v5 `ThemeConfig` (light + dark), mapped from the same palette |
| `src/main.tsx` | Wraps `<App />` in `<ConfigProvider theme={antdTheme}>` |

## Fonts

| DESIGN.md role | Font | Tailwind class | Notes |
|---|---|---|---|
| Display/Hero | Fraunces | `font-display` | Variable font, weights 400–700 loaded, SOFT/WONK axes left at default (off) |
| Body/UI | Schibsted Grotesk | `font-sans` (also the app default — plain `<body>` and any element without an explicit font class gets this) | 400–700 |
| Data/Tables/Code | IBM Plex Mono | `font-mono` | 400–600. `font-variant-numeric: tabular-nums` is applied automatically to `.font-mono`, `code`, `pre`, `kbd` in `src/index.css` — you don't need to add it per-element |

Loaded via a single Google Fonts CDN link in `index.html` (per DESIGN.md's
"Loading" note: CDN now, self-host at production scale — that migration is
out of scope here).

## Color tokens

Implemented as CSS custom properties in `src/index.css` under `:root`
(light values) and re-declared under both `.dark` (explicit class toggle)
and `@media (prefers-color-scheme: dark)` guarded by `:root:not(.light)` (see
"Dark mode mechanism" below). Exposed in `tailwind.config.js` as semantic
colors that read the custom properties, so they update live when the class
toggles — no rebuild needed to switch themes.

| DESIGN.md name | Custom property | Tailwind class | Light value | Dark value |
|---|---|---|---|---|
| Signal | `--color-signal` | `bg-signal` / `text-signal` / `border-signal` | `#E24D2E` | `#E86041` |
| Signal hover | `--color-signal-hover` | `bg-signal-hover` etc. | `#C83F22` | `#F37A5E` |
| Live | `--color-live` | `bg-live` / `text-live` | `#1F6E52` | `#3E9A77` |
| Live soft | `--color-live-soft` | `bg-live-soft` | `#D9E9DF` | `#234034` |
| Paper | `--color-paper` | `bg-paper` | `#F5F1E8` | `#171B19` |
| Surface | `--color-surface` | `bg-surface` | `#FFFCF6` | `#1E2321` |
| Surface-strong | `--color-surface-strong` | `bg-surface-strong` | `#E9E4D9` | `#262C29` |
| Ink | `--color-ink` | `text-ink` / `bg-ink` | `#1E2421` | `#EDE8DD` |
| Muted | `--color-muted` | `text-muted` | `#6E746F` | `#9AA19A` (dark values raised for contrast; DESIGN.md specifies "reduce neutral saturation ~10-20%" for neutrals generally, muted needed a lightness bump to stay legible on dark paper) |
| Border | `--color-border` | `border-border` | `#D8D2C6` | `#3A413D` |
| Success | `--color-success` | `bg-success` / `text-success` | `#2E7D5B` | `#3E9A77` |
| Warning | `--color-warning` | `bg-warning` / `text-warning` | `#B7791F` | `#D99A3D` |
| Error | `--color-error` | `bg-error` / `text-error` | `#D6452F` | `#E86041` |
| Info | `--color-info` | `bg-info` / `text-info` | `#39516E` | `#6F8FB5` |

**Discipline reminder baked into the palette, not enforced by tooling:**
signal red is for the answer moment only (Talk now / Call now / widget
answer button / 402 upsell / lead-score emphasis) — never decorative, never
a stand-in for "success." Live green means connected/healthy. Nothing in
Tailwind or antd stops a future PR from using `bg-signal` decoratively; that
discipline has to hold in code review.

## Type scale (Minor Third, 1.2)

| Token | Tailwind class | Size |
|---|---|---|
| caption | `text-caption` | 12px |
| label | `text-label` | 13px |
| body | `text-body` | 15px |
| lede | `text-lede` | 18px |
| h3 | `text-h3` | 24px |
| h2 | `text-h2` | 30px |
| h1 | `text-h1` | 40px |
| display | `text-display` | 64px |

Each entry also sets a line-height tuned for its role (tighter for large
display/heading sizes, more open for body/lede).

## Spacing (4px base)

| Token | Tailwind class (e.g. padding) | Value |
|---|---|---|
| 2xs | `p-2xs` | 2px |
| xs | `p-xs` | 4px |
| sm | `p-sm` | 8px |
| md | `p-md` | 16px |
| lg | `p-lg` | 24px |
| xl | `p-xl` | 32px |
| 2xl | `p-2xl` | 48px |
| 3xl | `p-3xl` | 64px |

These are additive to Tailwind's default numeric spacing scale (`p-4`,
`p-8`, ...), not a replacement — both are available. Prefer the named scale
for new work so spacing intent stays legible in class names.

## Radius

| DESIGN.md rule | Tailwind class | Value |
|---|---|---|
| Controls (buttons, inputs) | `rounded-control` | 4px |
| Cards | `rounded-card` | 10px |
| Widget panel | `rounded-widget` | 16px |
| Pills / call / status controls | `rounded-full` (Tailwind default) | 9999px |

Deliberately no global `borderRadius.DEFAULT` override — DESIGN.md is
explicit that uniform rounding everywhere is wrong for this system, so
`rounded-md`/`rounded-lg` etc. from Tailwind's defaults still exist
unchanged. Use the named tokens above for on-brand components.

## Layout

- `max-w-content` → 1180px (max content width).
- Grid/rail widths (12-col dashboard, 196px rail, marketing 7/5 asymmetric
  split) are layout decisions for actual page markup, not tokens — left for
  the page-migration pass.

## Motion

Added as Tailwind `transitionDuration` / `transitionTimingFunction` extensions:

| Token | Class | Value |
|---|---|---|
| micro | `duration-micro` | 100ms |
| short | `duration-short` | 200ms (DESIGN.md gives a 150–250ms range; 200ms picked as the single short value) |
| medium | `duration-medium` | 325ms (range 250–400ms) |
| long | `duration-long` | 550ms (range 400–700ms) |
| enter | `ease-enter` | `ease-out` |
| exit | `ease-exit` | `ease-in` |
| move | `ease-move` | `ease-in-out` |

The signature "call ring" animation (2.4s ping, `cubic-bezier(0,0,.2,1)` on
answer) is a component-level keyframe animation, not a base token — left for
whichever component implements the widget/dashboard answer state.

## Ant Design theming — the `colorPrimary` decision (needs your confirmation)

`src/theme/antdTheme.ts` exports `antdThemeLight` and `antdThemeDark`
(`ThemeConfig` objects using `theme.defaultAlgorithm` /
`theme.darkAlgorithm`), plus a plain `antdTheme` default (currently
`antdThemeLight`) wired into `<ConfigProvider>` in `src/main.tsx`.

**Decision: `colorPrimary` is ink (`#1E2421` light / `#EDE8DD` dark), not
signal red.**

Reasoning: Ant Design's `colorPrimary` isn't a single accent — it's consumed
pervasively and mostly *decoratively*: default `type="primary"` Buttons,
active Tabs underline, checked Checkbox/Radio/Switch, focus rings, the
active Pagination page, link color, selected Menu items, Slider track, and
more. DESIGN.md states signal red is reserved for "the answer moment ONLY"
and is "never used for decorative or success states," with an explicit
"absolute discipline" callout in the Decisions Log. Wiring `colorPrimary` to
signal red would make red ambient furniture across every antd component in
the dashboard — the opposite of "color is rare and meaningful." Ink was
chosen as a neutral, low-commitment primary, matching the shadcn-style token
discipline DESIGN.md cites via the Telnyx reference.

**Consequence you should know about:** `<Button type="primary">` will now
render ink-colored, not signal-red. Any genuine "answer moment" CTA (Talk
now, Call now, widget answer button, 402 upsell) must be styled explicitly —
e.g. `<Button className="!bg-signal hover:!bg-signal-hover !border-signal">`
or a plain styled `<button>` — rather than relying on antd's default
primary. This is intentional per the discipline above, but it means every
CTA needs a deliberate choice instead of inheriting red "for free."

**Please confirm:** if you'd rather have antd's primary buttons default to
signal red everywhere (accepting that trade-off against the "rare and
meaningful" principle), that's a one-line change in
`src/theme/antdTheme.ts` (`colorPrimaryLight` / `colorPrimaryDark`) — flag
it back and it'll be updated.

Other antd token mappings (not flagged, low-risk):

| antd token | Value (light) | Value (dark) | Source |
|---|---|---|---|
| `colorSuccess` | `#2E7D5B` | same (dark algorithm adjusts) | semantic success |
| `colorError` | `#D6452F` | — | semantic error |
| `colorWarning` | `#B7791F` | — | semantic warning |
| `colorInfo` | `#39516E` | — | semantic info |
| `colorBgBase` | `#F5F1E8` (paper) | `#171B19` | |
| `colorTextBase` | `#1E2421` (ink) | `#EDE8DD` | |
| `colorBgContainer` | `#FFFCF6` (surface) | `#1E2321` | |
| `colorBorder` | `#D8D2C6` | `#3A413D` | |
| `borderRadius` | `4` (controls) | same | antd's single global radius token can't express the card/widget/pill split — components needing 10px/16px/full radii should override per-instance with `styles={{ ... }}` or wrapper classes |
| `fontFamily` | `"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif` | same | |

Note on duplication: `antdTheme.ts` uses raw hex values, not
`var(--color-*)`. Ant's theme algorithm computes derived shades (hover,
active, disabled, contrast text) from these seed values at theme-generation
time in JS, so it cannot consume CSS custom properties the way Tailwind
utility classes do. If the palette changes, both `src/index.css` and
`src/theme/antdTheme.ts` need to be updated together — there's no single
source at runtime.

## Dark mode mechanism

`tailwind.config.js` sets `darkMode: 'class'`. The mechanism, fully wired at
the token layer:

1. **No class present, no explicit preference:** `:root` uses the light
   values from `src/index.css`.
2. **System prefers dark, no explicit class:** the
   `@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }` block
   in `src/index.css` applies the dark values automatically.
3. **Explicit toggle to dark:** add class `dark` to `<html>` (e.g.
   `document.documentElement.classList.add('dark')`). This both satisfies
   Tailwind's `dark:` variant (since `darkMode: 'class'`) and overrides the
   CSS custom properties via the `.dark` selector in `index.css`.
4. **Explicit toggle to light (even if system prefers dark):** add class
   `light` to `<html>`. This doesn't need its own property overrides (the
   `:root` defaults already are light) — it only needs to exist so the
   `:not(.light)` guard in the prefers-color-scheme block stops applying.

So a toggle component just needs to flip `document.documentElement.classList`
between `dark` / `light` (and persist the choice, e.g. `localStorage`) —
Tailwind utilities (`dark:bg-surface` etc.) and the CSS custom properties
both follow automatically. **Building that toggle UI is explicitly out of
scope for this pass** (`src/components/` is fenced off to another agent).

**Not yet wired: the route-based default.** DESIGN.md requires "dashboard
defaults dark, marketing defaults light" — i.e. the *default* (before any
user override) should depend on which surface is being rendered, layered on
top of (2) above. That requires knowing which route/layout is active, which
lives in `src/App.tsx` / `src/contexts/AuthContext.tsx` / dashboard vs.
marketing layout components — all fenced off from this pass. The follow-up
agent should add a small `ThemeContext` (or similar) that:
   - on mount, checks for a persisted user choice (`localStorage`) first,
   - else applies `dark` class on dashboard routes and `light` (or nothing,
     deferring to `prefers-color-scheme`) on marketing routes,
   - exposes a toggle function that sets the class and persists the choice.

The antd `<ConfigProvider>` in `src/main.tsx` currently always uses
`antdThemeLight`. Once that ThemeContext exists, `main.tsx` (or a wrapper
just inside it) should switch between `antdThemeLight` / `antdThemeDark`
based on the same signal, e.g.:

```tsx
const isDark = useThemeIsDark(); // from the new ThemeContext
<ConfigProvider theme={isDark ? antdThemeDark : antdThemeLight}>
```

## Legacy class audit (for the page-migration follow-up)

Raw counts from `grep -ro` across `src/` before this pass (unchanged by this
pass — no page markup was touched):

| Legacy class | Count | Suggested replacement |
|---|---|---|
| `blue-600` (all of `bg-`/`text-`/`border-` etc.) | 60 | `signal` for genuine answer-moment CTAs; `ink` for anything used as a neutral "primary" action color; audit case-by-case — this is the biggest single bucket and the one most likely to be misused as decorative |
| `gray-500` | 37 | `muted` |
| `blue-500` | 29 | same as `blue-600` — case-by-case: `signal` or `ink` |
| `blue-700` | 25 | same as `blue-600`, likely the hover/active variant → `signal-hover` if paired with a `signal` base, else a darker `ink` shade |
| `slate-900` | 18 | `ink` |
| `bg-white` | 26 | `bg-surface` (cards/panels) — check each: a few may legitimately want pure white, but DESIGN.md's surface is off-white `#FFFCF6` |
| `gray-900` | 20 | `ink` |
| `gray-100` | 16 | `bg-paper` (page background) or `bg-surface-strong` (hover/rail) depending on context |
| `slate-800` | 10 | `ink` (slightly softened — check contrast) |
| `gray-400` | 13 | `muted` or `border` depending on usage (text vs. border) |
| `slate-600` | 12 | `muted` |
| `gray-300` | 11 | `border` |
| `gray-700` | 11 | `ink` or `muted` depending on weight of usage |
| `red-600` | 8 | likely `error` (if used for form/validation errors) — do **not** default to `signal` just because it's red; confirm intent per usage |
| `slate-500` | 8 | `muted` |
| `gray-600` | 9 | `muted` |
| `slate-700` | 2 | `ink` |
| `green-600` | 2 | `success` or `live` depending on whether it means "call connected" (→ `live`) vs. generic success/confirmation (→ `success`) |
| `green-500` | 2 | same as `green-600` |
| `gray-200` | 4 | `border` or `surface-strong` |
| `gray-800` | 1 | `ink` |
| `red-500` | 0 | — |
| `yellow-500` | 0 | — |

Counts were produced with:
`grep -ro "<pattern>" src/ | wc -l` for each pattern above, run against the
working tree at the time of this pass.

## Definition-of-done verification performed

- `npx tsc --noEmit` — see report for result.
- `npm run lint` — see report for result.
- `npm run build` — see report for result.
- Runtime check of computed `body` font-family and custom-property
  resolution — see report for exact method used (dev server inspection vs.
  built CSS inspection) and result. No claim of pixel-level visual
  verification is made; screenshots/browser automation may not have been
  available in this environment — check the report for what was actually
  confirmed.

## Follow-up scope (page migration — NOT done in this pass)

This pass only made tokens exist and applied global defaults (fonts on
`<body>`, antd `ConfigProvider`). It did **not**:

- Touch any file under `src/pages/`, `src/components/`, `src/contexts/`, or
  `src/App.tsx` (explicitly fenced off).
- Replace any of the legacy Tailwind color classes listed above.
- Build the dark-mode toggle UI or the route-based dark/light default
  (ThemeContext — see "Dark mode mechanism" above).
- Implement the call-ring animation, widget states, lead card, or any other
  component pattern from DESIGN.md's "Component Patterns" section.
- Self-host fonts (still Google Fonts CDN, per DESIGN.md's own "Loading"
  note that CDN-now/self-host-at-scale is acceptable).

The follow-up agent can mechanically walk the legacy-class table above,
confirm the recommended `signal`/`ink`/`red-600→error` judgment calls where
marked "case-by-case," and wire the ThemeContext described above.

## 2026-08-04 QA fix pass — antd component-token defects

A user QA pass (with screenshots) reported: selected Menu/Select items
rendering as "heavy dark-olive blocks," a stray blue link color in a
dropdown, a broken `/logo.png` (404), and the Sider not matching the
196px rail width from DESIGN.md:49. Root causes and fixes, all in
`src/theme/antdTheme.ts` unless noted:

- **Dark-olive selected blocks (Menu, Select, Table row-selection,
  Cascader/DatePicker/Dropdown/Transfer/Tree/Steps/Calendar cells, and the
  global focus-ring shadow).** Root cause, confirmed by hand via
  `theme.getDesignToken()`: antd derives `colorPrimaryBg` /
  `controlItemBgActive` — the "selected/active fill" consumed by all of the
  above — by running its palette generator on `colorPrimary`. That
  generator assumes a mid-saturation brand color; fed the near-black ink
  seed (`#1e2421`), it produced a muddy mid-gray-olive (`#5d635f`) instead
  of a light tint. That olive also fed `controlOutline`, turning focus
  rings into a heavy ~64%-opacity near-black glow.
  Fix: `colorPrimaryBg` / `colorPrimaryBgHover` / `controlItemBgActive` /
  `controlItemBgActiveHover` / `controlItemBgActiveDisabled` are now
  overridden directly (as `token` overrides, NOT by touching the
  `colorPrimary` seed) to the warm surface-strong neutral and one hand-picked
  step deeper for hover. This fixes every consumer in one place. On top of
  that, `components.Menu` / `components.Select` / `components.Table` set the
  same values explicitly and per-component, per the task's "at minimum"
  instruction, so intent stays self-documenting even though the alias-level
  fix alone already covers them.
- **Active-menu-item indicator.** DESIGN.md's idiom is "hard rules and
  ledger lines," and signal red is reserved for a single meaningful accent.
  A left rule marking "you are here" on the selected nav item is exactly
  that idiom and a legitimate, non-decorative use of red. Ant Design's
  inline `Menu` has no component token for this (unlike `Tabs`' `inkBar`),
  so it's a small CSS rule in `src/index.css` (`.ant-menu-item-selected::before`,
  a 3px `var(--color-signal)` bar), not a token override.
- **Stray blue link color.** Hand-verified via `theme.getDesignToken()`
  that `colorLink` was NOT actually resolving to antd's literal default
  `#1677ff` — `colorInfo` was already overridden earlier in this doc's own
  pass, and antd's `colorLink = seed.colorLink || seed.colorInfo` fallback
  meant links already inherited the Info navy (`#39516e` / `#6f8fb5`). That
  navy reads as "blue" in a screenshot, so it's easy to mistake for the
  literal antd default. Either way, relying on an undocumented fallback
  chain for link color is fragile, so `colorLink` / `colorLinkHover` /
  `colorLinkActive` are now set explicitly and independently. A full DOM
  scan for computed styles containing `rgb(22, 119, 255)` (antd's literal
  blue) across a live render, in both light and dark theme, came back empty.
- **Broken `/logo.png`.** `public/` never had a `logo.png`; every dashboard
  page showed a broken-image icon. Replaced with an inline `<svg>` mark
  directly in `src/components/DashboardLayout.tsx` (an ink handset — two
  circles joined by a curved connector — with one signal-red dot as the
  "live connection" accent) plus the `click2call` wordmark in
  `font-display`. Inline SVG can never 404, and using `currentColor` /
  `var(--color-signal)` keeps it theme-aware without a duplicate dark-mode
  asset. A static twin (hardcoded light-mode hex, since an externally-loaded
  SVG can't inherit the host page's CSS custom properties) was also
  committed at `public/logo.svg` for any non-inline usage.
- **Sider width.** `width={250}` → `width={196}` to match DESIGN.md:49's
  "persistent 196px left rail." The `breakpoint="md"` / `onBreakpoint` /
  `onCollapse` / `collapsedWidth={0}` / header-hamburger collapse mechanism
  was not touched — only the numeric width prop changed. Verified via a live
  render (see report) that Sider width is exactly `196px` at desktop
  viewport width and collapses to zero-width below the breakpoint, matching
  pre-existing behavior.
- Also audited: `Tabs` (inkBar/itemSelectedColor already derive from
  `colorPrimary` directly, never touched `colorPrimaryBg` — no leak, no
  change needed), `Radio`/`Checkbox` (checked state uses `colorPrimary`
  directly for the same reason — no change), `Pagination` (`itemActiveBg`
  defaults to `colorBgContainer`, already correct), `Input`/`InputNumber`
  (`activeBorderColor`/`hoverBorderColor` set explicitly to ink for
  clarity, though they already derived correctly).
- Also fixed in `src/components/DashboardLayout.tsx` while in the file for
  the above: the Header/Content/hamburger button were still using legacy
  Tailwind classes (`bg-white`, `text-gray-600`, `hover:bg-gray-100`) and a
  heavy `box-shadow: rgba(0,0,0,0.1)` on both Sider and Header — replaced
  with the design-token classes (`bg-surface`, `text-muted`,
  `hover:bg-surface-strong`, `rounded-control`) and a thin
  `1px solid var(--color-border)` rule, matching DESIGN.md's "thin rules,
  ledger lines" direction instead of drop-shadow slop.
