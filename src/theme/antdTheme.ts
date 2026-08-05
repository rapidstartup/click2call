import { theme, type ThemeConfig } from 'antd';

/**
 * Ant Design v5 theme mapping for "The Exchange" design system.
 * See DESIGN.md (Color, Typography, Layout) and docs/design-tokens.md for the
 * full token rationale — in particular the `colorPrimary` decision below,
 * which is flagged there for explicit user confirmation.
 *
 * These are raw hex values, not CSS custom properties: antd's theme algorithm
 * (`theme.defaultAlgorithm` / `theme.darkAlgorithm`) computes hover/active/
 * disabled variants and contrast-derived neutrals from these seeds at
 * generation time, so it cannot consume `var(--color-*)` the way Tailwind
 * utilities do. Keep these values in sync with the custom properties in
 * `src/index.css` by hand — they are duplicated by necessity, not oversight.
 */

const sharedTokens: Partial<ThemeConfig['token']> = {
  fontFamily:
    '"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif',
  colorSuccess: '#2e7d5b',
  colorWarning: '#b7791f',
  colorError: '#d6452f',
  colorInfo: '#39516e',
  borderRadius: 4, // controls — see DESIGN.md radius discipline (cards/widget panel are set per-component, not globally)
  wireframe: false,
};

/**
 * colorPrimary decision: INK, not signal red.
 *
 * DESIGN.md is explicit that signal red (#E24D2E) is reserved for "the answer
 * moment ONLY" — Talk/Call CTAs, the widget's answer button, the 402 upsell —
 * and is "never used for decorative or success states." Ant Design's
 * `colorPrimary` is consumed pervasively and mostly decoratively: default
 * `type="primary"` buttons, active Tabs underline, checked
 * Checkbox/Radio/Switch, focus rings, Pagination's active page, link color,
 * selected Menu items, etc. Wiring colorPrimary = signal red would make red
 * ambient furniture across the whole dashboard instead of a rare, meaningful
 * accent — directly violating the "restrained... color is rare and
 * meaningful" principle and the "absolute discipline" called out in the
 * Decisions Log.
 *
 * Ink is used instead as a neutral, low-commitment primary (the same
 * shadcn-style discipline DESIGN.md cites as a reference). Actual
 * "answer moment" CTAs (Talk now / Call now / widget answer button / 402
 * upsell) should NOT rely on antd's default primary Button — they should be
 * styled explicitly with the `bg-signal` / `hover:bg-signal-hover` Tailwind
 * utilities (or a dedicated `<Button className="...">` override) so the red
 * stays deliberate rather than falling out of a global token.
 *
 * KEPT AS-IS in this pass (per explicit instruction) — see the
 * `colorPrimaryBg` / `controlItemBgActive` note below for the actual defect
 * this surfaced and how it was fixed WITHOUT touching colorPrimary itself.
 */
const colorPrimaryLight = '#1e2421'; // ink
const colorPrimaryDark = '#ede8dd'; // dark-mode ink

/**
 * ROOT CAUSE of the "heavy dark-olive block" defect (selected Menu items,
 * selected Select options, selected Table rows, Cascader/DatePicker/Dropdown/
 * Transfer/Tree active cells, and the focus-ring `controlOutline` shadow all
 * shared this bug):
 *
 * Ant Design derives `colorPrimaryBg` / `controlItemBgActive` (the
 * "selected/active fill" used by a dozen components) by running its palette
 * generator on `colorPrimary`. That generator assumes a mid-saturation brand
 * color and produces a *light* tint at the "Bg" step. `colorPrimary` here is
 * ink — a near-black, low-saturation neutral (#1e2421) — so the generator's
 * "light tint" step instead lands on a muddy mid-gray-olive (~#5d635f, hand
 * verified via `theme.getDesignToken`). That's the dark-olive block the user
 * saw behind "Dashboard" in the sidebar and behind the selected Select
 * option. It also fed `controlOutline` (the focus-ring shadow), making focus
 * rings render as a heavy ~64%-opacity near-black glow instead of a subtle
 * ring.
 *
 * Fix: override `colorPrimaryBg` / `colorPrimaryBgHover` / `controlItemBgActive`
 * / `controlItemBgActiveHover` / `controlItemBgActiveDisabled` directly as
 * MapToken overrides — these are NOT the `colorPrimary` seed itself, so this
 * does not reintroduce "ambient primary color" anywhere and does not touch
 * the colorPrimary decision above. Pointing them at the warm
 * surface/surface-strong neutrals fixes every component that consumes them
 * in one place (Menu, Select, Table row-selected, Cascader, DatePicker,
 * Dropdown, Transfer, Tree, Steps, Calendar, Splitter, and the global focus
 * ring) instead of patching each component's tokens individually. The
 * `components.Menu` / `components.Select` blocks further down additionally
 * set the same values explicitly (per the task's "at minimum" component-token
 * instruction) so the intent is self-documenting per-component, even though
 * the alias-level fix alone would already cover them.
 */
const surfaceStrongLight = '#e9e4d9';
const surfaceStrongHoverLight = '#e2dccb'; // one step deeper than surface-strong, for hover-on-active feedback
const surfaceStrongDisabledLight = '#eeeae0';
const surfaceStrongDark = '#262c29';
const surfaceStrongHoverDark = '#2d3330';
const surfaceStrongDisabledDark = '#232824';

// A lighter warm tint than surface-strong, for "active/hovered but not
// selected" states (e.g. Select's optionActiveBg) that need to sit visually
// between plain surface and the surface-strong selected fill.
const optionActiveBgLight = '#f4f0e8';
const optionActiveBgDark = '#222725';

// Subtler than surface-strong — used for Menu item hover (not selected).
// A low-alpha ink/paper wash rather than a second solid neutral, so hover
// reads as "quieter than selected," not just "a different flat color."
const menuItemHoverBgLight = 'rgba(30, 36, 33, 0.05)';
const menuItemHoverBgDark = 'rgba(237, 232, 221, 0.05)';

/**
 * colorLink / colorLinkHover / colorLinkActive.
 *
 * Verified via `theme.getDesignToken` that because `colorInfo` was already
 * overridden below (to the DESIGN.md "Info" semantic token, #39516e /
 * #6f8fb5), antd's `colorLink = seed.colorLink || seed.colorInfo` fallback
 * meant links were NOT actually resolving to the literal antd default
 * `#1677ff` in this app. They were resolving to the Info navy, which reads
 * as "blue" in a screenshot even though it isn't literally antd's default —
 * that's almost certainly what was flagged. Either way, relying on the
 * implicit colorInfo fallback for link color is fragile (a future change to
 * colorInfo would silently change link color too), so colorLink is now set
 * explicitly and independently, still inside the restrained neutral/semantic
 * palette — never the raw antd blue.
 */
const colorLinkLight = '#39516e'; // = colorInfo (light) — reads as a muted, intentional navy, not antd-blue
const colorLinkHoverLight = '#4c6884';
const colorLinkActiveLight = '#2c3f54';
const colorLinkDark = '#6f8fb5'; // = colorInfo (dark)
const colorLinkHoverDark = '#89a4c4';
const colorLinkActiveDark = '#587494';

export const antdThemeLight: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: colorPrimaryLight,
    colorBgBase: '#f5f1e8', // paper
    colorTextBase: '#1e2421', // ink
    colorBgContainer: '#fffcf6', // surface
    colorBgLayout: '#f5f1e8', // paper
    colorBorder: '#d8d2c6', // border
    colorBorderSecondary: '#e9e4d9', // surface-strong
    colorLink: colorLinkLight,
    colorLinkHover: colorLinkHoverLight,
    colorLinkActive: colorLinkActiveLight,
    // See "ROOT CAUSE" comment above.
    colorPrimaryBg: surfaceStrongLight,
    colorPrimaryBgHover: surfaceStrongHoverLight,
    controlItemBgActive: surfaceStrongLight,
    controlItemBgActiveHover: surfaceStrongHoverLight,
    controlItemBgActiveDisabled: surfaceStrongDisabledLight,
  },
  components: {
    Menu: {
      itemSelectedBg: surfaceStrongLight,
      itemSelectedColor: colorPrimaryLight,
      itemHoverBg: menuItemHoverBgLight,
      itemHoverColor: colorPrimaryLight,
      itemActiveBg: surfaceStrongLight,
      itemBorderRadius: 4,
    },
    Select: {
      optionSelectedBg: surfaceStrongLight,
      optionSelectedColor: colorPrimaryLight,
      optionActiveBg: optionActiveBgLight,
    },
    Table: {
      // Same values as the alias-level fix above, set explicitly per the
      // task's component checklist. Row selection (checkbox-select) was
      // rendering the same dark-olive block as Menu/Select.
      rowSelectedBg: surfaceStrongLight,
      rowSelectedHoverBg: surfaceStrongHoverLight,
    },
    Radio: {
      // colorPrimary (ink) already drives the checked dot/border correctly —
      // audited, no dark-olive leak here (Radio doesn't consume
      // colorPrimaryBg/controlItemBgActive for its checked state, only for
      // Radio.Button's disabled-checked background, which the alias-level
      // controlItemBgActiveDisabled fix above already covers).
    },
    Checkbox: {
      // Same audit result as Radio — checked square fill uses colorPrimary
      // directly, already ink, no leak.
    },
    Pagination: {
      // itemActiveBg defaults to colorBgContainer (surface) already — no
      // leak. Active page number border/text use colorPrimary (ink) — fine.
    },
    Input: {
      activeBorderColor: colorPrimaryLight,
      hoverBorderColor: colorPrimaryLight,
    },
    InputNumber: {
      activeBorderColor: colorPrimaryLight,
      hoverBorderColor: colorPrimaryLight,
    },
    DatePicker: {
      // Cell hover/active fills consume controlItemBgActive — covered by the
      // alias-level fix above. Explicit override kept minimal to avoid
      // duplicating antd's larger DatePicker token surface unnecessarily.
      activeBorderColor: colorPrimaryLight,
      hoverBorderColor: colorPrimaryLight,
      cellActiveWithRangeBg: surfaceStrongLight,
    },
  },
};

export const antdThemeDark: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: colorPrimaryDark,
    colorBgBase: '#171b19', // paper (dark)
    colorTextBase: '#ede8dd', // ink (dark)
    colorBgContainer: '#1e2321', // surface (dark)
    colorBgLayout: '#171b19', // paper (dark)
    colorBorder: '#3a413d', // border (dark)
    colorBorderSecondary: '#262c29', // surface-strong (dark)
    colorLink: colorLinkDark,
    colorLinkHover: colorLinkHoverDark,
    colorLinkActive: colorLinkActiveDark,
    // See "ROOT CAUSE" comment above.
    colorPrimaryBg: surfaceStrongDark,
    colorPrimaryBgHover: surfaceStrongHoverDark,
    controlItemBgActive: surfaceStrongDark,
    controlItemBgActiveHover: surfaceStrongHoverDark,
    controlItemBgActiveDisabled: surfaceStrongDisabledDark,
  },
  components: {
    Menu: {
      itemSelectedBg: surfaceStrongDark,
      itemSelectedColor: colorPrimaryDark,
      itemHoverBg: menuItemHoverBgDark,
      itemHoverColor: colorPrimaryDark,
      itemActiveBg: surfaceStrongDark,
      itemBorderRadius: 4,
    },
    Select: {
      optionSelectedBg: surfaceStrongDark,
      optionSelectedColor: colorPrimaryDark,
      optionActiveBg: optionActiveBgDark,
    },
    Table: {
      rowSelectedBg: surfaceStrongDark,
      rowSelectedHoverBg: surfaceStrongHoverDark,
    },
    Radio: {},
    Checkbox: {},
    Pagination: {},
    Input: {
      activeBorderColor: colorPrimaryDark,
      hoverBorderColor: colorPrimaryDark,
    },
    InputNumber: {
      activeBorderColor: colorPrimaryDark,
      hoverBorderColor: colorPrimaryDark,
    },
    DatePicker: {
      activeBorderColor: colorPrimaryDark,
      hoverBorderColor: colorPrimaryDark,
      cellActiveWithRangeBg: surfaceStrongDark,
    },
  },
};

/**
 * Default export for the initial ConfigProvider wiring in src/main.tsx.
 * Per DESIGN.md, dashboard surfaces should default dark and marketing
 * surfaces should default light, with prefers-color-scheme driving the
 * default and an explicit toggle available in both. That route-aware /
 * system-aware switching needs a ThemeContext (src/contexts is currently
 * fenced off to another agent) — see docs/design-tokens.md for the exact
 * hook-up. Until that lands, this foundation wires the light theme as the
 * safe, non-breaking default.
 */
export const antdTheme = antdThemeLight;
