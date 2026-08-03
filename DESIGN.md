# Design System — click2call

**Direction: "The Exchange"** — warm paper, ink, and a single signal-red accent. A modern telephone exchange, not a telemetry feed. The product promise is "a real person is about to answer" — the visual language must make that feel true in the first three seconds.

## Product Context

- **What this is:** click2call turns website visitors into phone conversations. An embeddable call button expands into a live voice call answered by an AI or human agent, with recording, transcription, and analytics.
- **Who it's for:** small-to-mid business owners who want a higher-converting contact surface than forms or chat; developers who install the widget.
- **Space/industry:** click-to-call widgets (WebCallHub, CallPage) + voice-AI platforms (Retell AI, Telnyx Mission Control).
- **Project type:** web app (dashboard) + marketing site (landing/pricing) + embeddable customer-facing widget. The system covers all three.

## Aesthetic Direction

- **Direction:** "The Exchange" — a modern telephone exchange at golden hour. Warm paper surfaces, near-black ink, editorial serif headlines, hard rules and ledger lines.
- **Decoration level:** minimal. Thin rules, ledger lines, one live-ring animation. No gradients, no decorative blobs, no floating glass cards.
- **Mood:** calm, warm, trustworthy, operational. "A human just picked up." Trust first, tech second.
- **Reference sites:** Telnyx (cream `#fefdf5`, mint identity, shadcn token discipline); Retell (data density); Mercury (editorial polish). Established via research in the /design-consultation session.

## Typography

- **Display/Hero:** Fraunces (Google Fonts, variable, weights 400-700, SOFT/WONK defaults off) — warm editorial serif for headlines, hero, and big KPI figures. *Alternative: Newsreader (more restrained).*
- **Body:** Schibsted Grotesk (Google Fonts, weights 400-700) — humanist grotesk for all UI text, labels, body copy. *Alternative: Familjen Grotesk.*
- **UI/Labels:** same as body (Schibsted Grotesk 500-600 for interactive, 400 for descriptions).
- **Data/Tables:** IBM Plex Mono (Google Fonts, weights 400-600) with `font-variant-numeric: tabular-nums` — call durations, costs, IDs, statuses, timestamps. Numbers are the ledger; they align like a logbook.
- **Code:** IBM Plex Mono.
- **Loading:** Google Fonts CDN `<link>`; self-host at production scale. Fraunces + Schibsted Grotesk + IBM Plex Mono via `@import`/link tags.
- **Scale:** Minor Third (1.2):
  - caption 12 · label 13 · body 15 · lede 18 · h3 24 · h2 30 · h1 40 · display 64

## Color

- **Approach:** restrained. One signal accent + warm neutrals; color is rare and meaningful.
- **Primary — Signal:** `#E24D2E` — the answer moment ONLY. "Talk now", "Call now", "Build your call button", the widget's answer button, the 402 upsell CTA, lead-score emphasis. Hover `#C83F22`. Never used for decorative or success states.
- **Live:** `#1F6E52` — a line is connected/healthy (live badge, connected state, success). Companion soft tint `#D9E9DF`.
- **Neutrals (warm):** Paper `#F5F1E8` (app background), Surface `#FFFCF6` (cards), Surface-strong `#E9E4D9` (hover, rails), Ink `#1E2421` (primary text), Muted `#6E746F` (secondary), Border `#D8D2C6`.
- **Semantic:** success `#2E7D5B`, warning `#B7791F`, error `#D6452F`, info `#39516E`.
- **Contrast:** Ink-on-paper 12.9:1 (AAA); Signal-on-white 4.6:1 (AA) — never place signal text/button on muted.
- **Dark mode:** first-class, token-driven. Warm-tinted dark, never pure black: paper `#171B19`, surface `#1E2321`, surface-strong `#262C29`, ink `#EDE8DD`, border `#3A413D`. Raise signal `#E86041` and live `#3E9A77`; reduce neutral saturation ~10-20%. Dashboard defaults dark, marketing defaults light, `prefers-color-scheme` drives the default; explicit toggle in both.

## Spacing

- **Base unit:** 4px.
- **Density:** comfortable (dashboard) / spacious (marketing).
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout

- **Approach:** hybrid. Grid-disciplined dashboard (the switchboard), creative-editorial marketing (the poster).
- **Grid:** dashboard 12-col with persistent 196px left rail; marketing asymmetric 7/5 (content / live product evidence).
- **Max content width:** 1180px.
- **Border radius:** controls 4px, cards 10px, widget panel 16px, full (9999px) for pills and call/status controls only. No uniform rounding everywhere.

## Motion

- **Approach:** intentional, strictly functional. Nothing drifts, floats, or pulses without meaning.
- **Signature:** the call ring — handset button rings once on answer (2.4s ping, `cubic-bezier(0,0,.2,1)`) and the widget waveform responds to live audio. Marketing hero shows a line-connect draw.
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro(100ms) short(150-250ms) medium(250-400ms) long(400-700ms).

## Component Patterns

- **Widget states (defaults to the "Exchange" theme; owners can recolor):** closed = signal-red circle + handset + "Talk to us" tab (never a chat bubble); expanded idle = warm ivory panel, business name + availability first, "Talk now" / "Request a callback"; live = quieter UI, elapsed time, waveform, mute, end; human vs AI stated plainly ("You're speaking with Mia, our AI receptionist"); **402 upsell** = "Your free minutes are used up" + spend meter + "Add minutes — from $9/mo".
- **Dashboard:** dominant operational sentence first ("18 conversations started this week"), spend/cap/status on one baseline, calls ledger (mono numerics, waveform fragment, play) as the truth; charts are summaries. Selecting a call opens a fixed reading pane (recording, transcript, summary, cost chronology) — no navigation away.
- **Lead card (Phase D wedge):** avatar monogram, caller + transcript excerpt, signal-colored lead score. AI summarizes; humans drill down.
- **Empty states:** one clear action ("Connect your first widget…"), no dead charts.
- **Anti-slop (never):** purple gradients, 3-column icon-benefit grids, centered-everything heroes, decorative blobs, generic "supercharge" copy, Inter/Roboto as primary.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-03 | Initial design system created ("The Exchange") | Created by /design-consultation from research + three-voice synthesis (Claude main, Codex, Claude subagent all converged) |
| 2026-08-03 | Warm paper + ink instead of dark glass / white-gray SaaS | Category is split between cold consoles and dated widgets; the product promise is human connection |
| 2026-08-03 | Signal red `#E24D2E` reserved for the answer moment | The color a visitor can't miss; absolute discipline: red starts conversations, green means connected |
| 2026-08-03 | Editorial serif (Fraunces) in a comms product | Distinctive, human; paired with grotesk UI + hard rules to stay operational |
