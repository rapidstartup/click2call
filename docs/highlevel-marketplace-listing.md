# HighLevel Marketplace Listing — click2call

Reference copy for the marketplace.gohighlevel.com app listing form. Draft — review before publishing.

## App name

**Click2Call AI** — the name already registered in the developer portal (app ID `6a773054e3f2f86382d642f0`, created 2026-08-08). The App name field is read-only in the portal, so this is the name the listing will carry.

## Tagline (one-liner, ~60 chars)

Turn website visitors into phone conversations, right in your CRM.

## Short description (~150 chars, for listing cards)

Add a click-to-call widget to any site. Calls route to AI or your team, and every lead lands straight in HighLevel — contact, opportunity, and transcript.

## Full description

click2call puts a click-to-call button on any website — no phone tree, no app install for the visitor, just a live voice conversation started from the browser. Calls are answered by an AI assistant or routed to a human, and every conversation becomes a warmed lead in your HighLevel account automatically.

**What agencies get with the HighLevel integration:**

- **One-click setup.** Install from the Marketplace and your click2call account is provisioned automatically — no separate signup, no manual API key wiring.
- **Leads land in your CRM.** Every completed call creates a Contact and an Opportunity in a dedicated pipeline, with the caller's name, email, phone, and an AI-scored intent level — not just an email notification you have to act on manually.
- **Call transcripts in Conversations.** The full call transcript is pushed into the contact's Conversation thread, so it sits alongside their SMS, email, and chat history instead of living in a separate tool.
- **Your own numbers.** Pick from your HighLevel-provisioned phone numbers when routing calls, instead of typing in digits by hand.
- **AI or human, your choice.** Route calls to a built-in AI voice assistant, forward to a phone number, take a voicemail-to-email, or connect your own VAPI/Twilio setup — per widget, with business-hours fallback.

Built for agencies who run client websites and funnels through HighLevel and want a higher-converting contact surface than a form — a real conversation, started the moment a visitor is ready to talk.

## Category

Still unconfirmed — the Category dropdown is disabled while the app is Private, so the option list can't be read. A sibling public app on the same account uses "Marketing automation", so the taxonomy is single-select free-form-ish rather than a strict "CRM / Communication" pair. Pick the closest option once the form unlocks.

## Scope justification (map 1:1 to the OAuth scopes requested — reviewers check this)

| Scope | Why click2call needs it |
|---|---|
| `contacts.readonly` / `contacts.write` | Create/update a Contact from each captured lead |
| `pipelines.readonly` / `pipelines.write` / `pipelines.create` | Create a dedicated "click2call Leads" pipeline and drop Opportunities into it |
| `conversations.readonly` / `conversations.write` / `conversations/message.readonly` / `conversations/message.write` | Push the call transcript into the contact's Conversation thread |
| `conversations/reports.readonly` | Surface call-outcome data alongside other conversation reporting |
| `locations.readonly` + `locations/customFields.*` / `customValues.*` / `tags.*` | Enrich the Contact record (tags, custom fields) with lead context (intent score, call outcome) |
| `users.readonly` | Resolve the installing location's owner identity during setup |
| `phonenumbers.read` / `numberpools.read` | Let the widget-creation flow offer the location's real numbers as a destination dropdown |

*Not requested*: `conversations/livechat.write` — dropped, not used by anything in this integration (see engineering plan).

## Assets

### App logo — spec confirmed from the portal

1:1 aspect ratio · PNG, SVG, JPEG, JPG or GIF · min 400x400, max 800x800 · max 500 kB.
Portal warning: "avoid highlevel or gohighlevel references to ensure approval."

Candidates generated 2026-08-09 (Gemini `gemini-2.5-flash-image`), in `docs/marketplace-assets/`:

| File | Concept | Verdict |
|---|---|---|
| `logo-a-circle-handset-512.png` | Signal-red circle, ivory handset knocked out | **Recommended** — mirrors the widget's own closed state per DESIGN.md; best at 32px. Minor: faint vignette on the circle where DESIGN.md says no gradients |
| `logo-b-handset-ring-512.png` | Ink handset + red ring arcs | Rejected — black background bleeds into the square's corners |
| `logo-c-cursor-handset-512.png` | Handset fused with an arrow cursor | Viable — sharpest "click"+"call" idea, but the cursor tip vanishes at small sizes |

Originals are 1024x1024 (`logo-*.png`, ~890 kB) — over both limits; use the `-512` variants.

### Screenshots — not yet captured

3-5 needed: widget closed/answer state, widget mid-call, the dashboard's Widgets tab, a lead as a HighLevel Contact/Opportunity, the transcript inside a Conversation thread.

The last two come from a HighLevel location with real click2call data, not from this repo. Playwright is not installed (absent from `package.json` entirely), so capturing these needs either a Playwright install or a logged-in browser session against the dashboard.

## Support / legal URLs

- Support email: `support@click2call.ai` (confirmed 2026-08-09)
- Privacy policy: `https://click2call.ai/privacy` — **returns 404 in production** (verified 2026-08-09)
- Terms of service: `https://click2call.ai/terms` — **returns 404 in production** (verified 2026-08-09)

`src/pages/PrivacyPolicyPage.tsx` and `src/pages/TermsOfServicePage.tsx` exist locally but are untracked in git and not deployed. Reviewers open both URLs during approval, so these must ship before the listing is submitted.

## Pricing

Decision (2026-08-09): **billed through HighLevel marketplace billing**, not via the in-app Stripe integration. Plan names and price points still needed — the Pricing form is locked while the app is Private, so the available plan shapes (flat monthly, per-seat, usage, trial) haven't been read yet.

## Submission status — blocked

Verified in the developer portal on 2026-08-09:

1. **The app is registered as Private** (My apps → App Type). Private apps install by direct link and have no public listing, so every field on Basic Info, and the Save button, render disabled. Confirmed by comparison: a sibling app that is Public + Draft has the identical form fully editable.
2. **"Make Public" is a no-op.** The row menu (My apps → Private badge) offers Edit / Copy Installation Link / Make Public. Clicking Make Public closes the menu but fires **no network request** to `backend.leadconnectorhq.com`, shows no dialog, no toast, and leaves App Type unchanged. Retried across fresh page loads. Not a click-targeting problem and not a stale session — the developer session authenticates fine and resolves developer ID `61fa4c58d9d86b6419bd6e50`.

Likely explanations, in order: HighLevel gates converting an already-Live private app to public (may require a support ticket or a fresh app created as Public); an account-level permission; or a portal bug. Worth raising via Support Tickets in the portal.

Until the app is Public, none of the 5 mandatory steps (Basic info, Profile details, Support details, Pricing details, Publish) can be filled in.

## OAuth redirect URI (already registered)

`https://click2call.ai/api/lc/oauth`

## Webhook URL

`https://click2call.ai/api/lc/webhooks`
