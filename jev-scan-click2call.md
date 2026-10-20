# Jev scan — Click2Call web + mobile

**Mode:** research and notes only. **Autopilot: OFF.** No model-controlled
side effects, board edits, production changes, or merges were performed.

## Scope and evidence

- Repository: `rapidstartup/click2call`
- Reviewed source SHA: `4ce7fc57558a748a8f6b5312aadebc6d60ca8d8b`
  (`feat: modernize Vapi widget and mobile app (#13)`)
- The requested TypeSafe AI skill was added with
  `npx skills add typesafe-ai/skills --skill typesafe-ai`. This adds agent
  guidance only; it is not an application/runtime integration.
- I found no repository reference to a VD board and `gh project list
  --owner rapidstartup` returned no visible projects. The VD proposals below
  therefore cover the requested Click2Call web and mobile boards, but do not
  assert their current board contents or create items.
- TypeSafe sources reviewed: [building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md),
  [API](https://docs.typesafe.ai/api.md), [models](https://docs.typesafe.ai/models.md),
  [confidence](https://docs.typesafe.ai/confidence.md), [state](https://docs.typesafe.ai/concepts/state.md),
  [parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions.md),
  [pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md),
  [guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails.md), and
  [known Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md).

## What is using an LLM today

There is no direct OpenAI, Anthropic, Gemini, LangChain, or Vercel AI SDK
integration in the source or root/mobile package manifests. Do not infer that
the GPT examples in `docs/unit-economics.md` are the configured production
models; that document explicitly presents example cost stacks.

The present AI boundary is **Vapi**, whose assistant configuration/model prompt
is external to this repository:

1. **Web voice widget — active runtime path.**
   `src/components/CallWidget.tsx` creates a Vapi Web SDK session and starts the
   stored `assistantId`. The socket server validates a short-lived widget token
   and exposes only that assistant ID (`server/socket.ts`,
   `server/socketSecurity.ts`). `server/vapiProxy.ts` creates the Vapi web call
   with the server-side Vapi credential and meters it. Vapi consequently owns
   the live speech-to-text, conversational generation, text-to-speech, and
   its configured tooling.
2. **Vapi lead capture — active assisted-action path.**
   `server/vapiProvision.ts` reads an external Vapi assistant and patches its
   `model.tools` with `record_lead`. When the Vapi assistant calls that tool,
   `netlify/functions/vapi-escalate.ts` records name/email/phone/message,
   Vapi-supplied `intent_score`, and an outcome. This is a model-generated
   tool-call payload, not a Click2Call model call.
3. **Vapi post-call analysis — active data-ingestion path.**
   `server/vapiWebhook.ts` accepts the provider webhook and uses
   `analysis.structuredData.outcome` if supplied. It persists call status,
   duration, provider-reported cost, a recording reference, a transcript
   reference, and UTM metadata. It does **not** persist transcript text.
4. **Web reporting.**
   The web reports view shows the provider-derived call metadata, outcome,
   cost, and private-recording state; it makes no LLM call.
5. **Mobile.**
   The Expo client only registers a device, toggles `widget_routes`, and reads
   the most recent 50 call ledger entries (`mobile/services/api.ts`,
   `server/routes/mobile.ts`). It has no LLM path. The route table is not used
   elsewhere in this source to dispatch a push notification or a live mobile
   call.

## Where Jev fits — and where it does not

Jev is a text-only System One decision model: it accepts text/JSON state and
returns typed `Choice`, `Noul`, and `Score` answers with probabilities
(`Choice` and `Score` also have confidence). TypeSafe documents most queries as
about 100 ms, but that is not a Click2Call end-to-end latency commitment.
`jev-latest` currently resolves to `jev-1.13.0`; the published price is
$0.042 per million input tokens with no output-token charge.

It is a good candidate for bounded, auditable semantic judgments over a
transcript or configuration. It is **not** a replacement for the live Vapi
assistant: Jev cannot process audio, transcribe speech, synthesize speech,
generate an open-ended spoken answer, reliably do numeric work, or choose and
execute side effects. Vapi (or equivalent STT/TTS plus a generative dialogue
model) remains necessary for the actual conversation. Ordinary code must own
metering, routing, consent, database writes, and external actions.

### Best first replacement candidate: post-call disposition

Run Jev *after* a completed Vapi call, initially in shadow mode, against a
minimal text state:

```text
{
  transcript: "...",
  widget_policy: "qualified means the caller has stated a relevant need and agreed to follow up",
  allowed_outcomes: [
    "lead_captured", "booked", "qualified", "unqualified", "no_contact", "unknown"
  ]
}
```

Ask one batched request containing narrow questions, for example:

- `outcome`: `Choice` over the existing five outcomes plus `unknown`;
- `has_contact_permission`, `asked_for_human`, `requested_callback`, and
  `opted_out`: separate `Noul` questions;
- `qualification`, `urgency`, `frustration`, and `follow_up_priority`: separate
  `Score` questions with written business rubrics;
- `topic`: `Choice` over a per-widget controlled taxonomy.

Persist raw answers, model version, question/policy version, and the
provider-supplied outcome in a new assessment record. Code, not Jev, chooses a
display label. Start by comparing Jev versus Vapi `structuredData.outcome` and
human review. Do not overwrite the current `calls.outcome` or trigger lead
emails until measured precision/recall and confidence thresholds are accepted.
For low-confidence `Choice`/`Score` answers, show “needs review” or retain the
provider result. A `Noul` has no separate confidence, so use its calibrated
probability with a deliberately conservative review band.

This can replace a **post-call Vapi structured-analysis LLM judgment** once
validated. It cannot replace the conversational Vapi LLM. It also needs a
secure transcript-text ingestion path: the current schema stores only
`transcript_ref`, so no existing webhook payload gives Jev usable text.

### Second candidate: safer live routing, not live generation

Once final/partial transcript segments are available, batch a small decision
battery before an irreversible handoff:

- `handoff_target`: `Choice` among AI assistant, available human/mobile queue,
  voicemail, and clarify;
- `escalation_reason`: `Choice` from a controlled list;
- `urgent`, `human_requested`, `sensitive_data`, `abusive_or_unsafe`, and
  `do_not_contact`: `Noul`;
- `severity`: `Score`.

The application applies deterministic rules: for example, an explicit
opt-out always overrides a score; mobile handoff occurs only when an available
device and the user’s routing policy permit it. A risky or uncertain result
must preserve the present route or seek confirmation, not silently transfer,
hang up, or message a customer.

This provides fast classification/guardrails around Vapi but does not make a
voice assistant. It requires streaming transcript access, debounce/freshness
checks, and an actual mobile notification/call-dispatch implementation that
does not currently exist in this repository.

### Contact extraction: support, not replacement

For email and phone fields, use code to find candidate spans with strict
parsers/regexes, then ask Jev to select the span playing the caller’s contact
role (or `none`). Copy and normalize the selected original span in code. This
matches TypeSafe’s documented pre-parsed extraction pattern and avoids an
invented or transposed number.

Jev should not be asked to generate a name, email, or phone number from
free-form transcript text. Names in particular need an existing roster,
named-entity candidate generator, or a generative model before Jev can choose
among candidates. Preserve Vapi’s current live lead-capture tool for
collection unless a validated replacement has both consent and correct
candidate coverage.

### Widget setup and reporting

Jev can choose among *pre-authored* call-flow templates—such as sales
qualification, support triage, booking, or voicemail—and select policy
profiles from a closed list based on the business’s written setup answers. It
can also attach explainable labels to call reports and rank calls that warrant
review.

It cannot write a bespoke assistant prompt or compose a caller-facing
conversation. Keep a generative model or a human for that creative task, then
use Jev to verify bounded policy properties if useful. It must not choose Vapi
credentials, modify an assistant, publish a widget, or change billing.

## New customer features enabled

### Click2Call web

1. **Evidence-backed Call Intelligence.** Per-call disposition, topic,
   urgency, request-for-human, opt-out, and review status; the dashboard shows
   probabilities/confidence and the transcript snippets or timestamps that a
   reviewer can inspect. The current reports have only one provider outcome.
2. **Human-handoff policy.** A per-widget, owner-configured rule such as
   “route sales intent and explicit human requests to the on-call team; leave
   after-hours messages otherwise.” Jev only supplies typed signals; the
   policy engine chooses the route.
3. **Consent and safety screening.** Detect likely disclosure of a payment
   card, account credential, sensitive personal information, threats, or a
   contact opt-out in transcript text. Route to a defined safe path and flag
   human review. This is an additional control, not a legal/compliance
   guarantee.
4. **Template matcher for widget creation.** Recommend a reviewed assistant
   template and routing policy from the customer’s stated goal, while allowing
   the customer to confirm every selection.

### Click2Call mobile

1. **Priority callback inbox.** The current call ledger can display Jev’s
   structured labels—“human requested,” “high urgency,” “callback requested,”
   or “review”—and let the owner filter/sort a short actionable queue.
2. **Contextual handoff notification.** When a confidence-gated,
   deterministic policy chooses a mobile route, notify the eligible owner with
   a short factual summary assembled by code from fields/labels (not a
   fabricated AI summary). Require an explicit accept/decline in the app.
3. **Review and correction loop.** Owners confirm/correct outcome and priority
   in the app. Those labels create the evaluation set needed to tune
   thresholds and assess Jev against Vapi analysis; they do not fine-tune Jev
   automatically.

## Cost and implementation implications

The published Jev rate makes post-call classification plausibly inexpensive:
2,000 input tokens would be approximately $0.000084 before the question
tokens, retries, and any transcript retrieval/storage costs. That is not an
actual Click2Call saving estimate. The current source records a provider
`cost_usd`, while `docs/unit-economics.md` gives illustrative all-in Vapi
stacks where LLM is only one component alongside Vapi, STT, TTS, and
telephony. Jev would not remove those non-LLM costs, and the repository does
not reveal the current Vapi assistant model, token usage, or transcript
lengths needed for a valid comparison.

Use one request with independent questions over a minimal transcript/policy
state rather than serial calls. TypeSafe’s documented benchmark shows batching
shared-document questions avoids repeatedly sending the same state, but its
12.2× figure is specific to a 13-question GDPR-document experiment and must
not be projected as a Click2Call result. Node 24 is configured for Netlify,
which meets the JavaScript SDK’s Node 20+ prerequisite if that SDK is adopted.

## Risks and controls

| Risk | Control before a customer-facing decision |
| --- | --- |
| No transcript text in the current data model | Design authenticated transcript retrieval/retention and add explicit consent, deletion, and access controls before any Jev request. Do not send recordings/audio: Jev accepts text only. |
| Incorrect disposition, unsafe routing, or false opt-out | Shadow mode; per-widget evaluation set; separate raw signal from action; conservative thresholds; explicit human confirmation for handoff/outreach; deterministic opt-out precedence. |
| Jev is literal and weak on math, dates, indirection, large/hostile state, and generation | Keep exact calculations/time windows in code; state exact rubrics and boundary cases; send only relevant text; do not use Jev for generation; test prompt-injection/adversarial transcripts. |
| Partial transcript becomes stale or changes meaning | Version/debounce segments, attach call/transcript timestamps, re-evaluate only on final text for irreversible actions, and never apply an answer to a different call state. |
| English-first accuracy and multi-tenant policy variation | Evaluate by language, industry, and widget policy; pin a version such as `jev-1.13.0` while thresholds are calibrated; record the returned model version. |
| Provider/API failure or rate limit | Treat assessment as optional at first; retain Vapi/default behavior; use SDK retry/backoff for 429/529 responses; add idempotency and dead-letter/review handling. |
| Secrets and untrusted clients | Keep `TYPESAFE_API_KEY` server-side in Netlify/server environment only. Never expose it to the web widget or Expo client, and never include Vapi/Supabase credentials in prompts, logs, reports, or board items. |
| Privacy, recording, and outreach rules | Confirm jurisdictional recording consent, DPA/vendor retention, data minimization, retention/deletion, and the product’s opt-out policy with counsel. A classifier does not create legal compliance. |

## Suggested VD board items — Autopilot OFF

These are proposed titles only. They are deliberately split by requested board
and require normal human prioritization/review; no VD item was created or
enabled for Autopilot.

### Click2Call web

1. **[Autopilot OFF] Shadow Jev post-call disposition beside Vapi outcome**
2. **[Autopilot OFF] Secure transcript-text ingestion and retention policy for Call Intelligence**
3. **[Autopilot OFF] Confidence-gated web dashboard: reviewable intent, urgency, and opt-out labels**
4. **[Autopilot OFF] Human-handoff policy engine for Vapi transcript signals**
5. **[Autopilot OFF] Closed-set widget template matcher; no generated assistant prompts**

### Click2Call mobile

1. **[Autopilot OFF] Priority callback inbox from reviewed post-call signals**
2. **[Autopilot OFF] Explicit accept/decline mobile handoff notifications**
3. **[Autopilot OFF] Mobile call-outcome correction loop and threshold evaluation dataset**
4. **[Autopilot OFF] Display-only confidence and “needs review” states in the call ledger**

## Recommended order

1. Confirm that Vapi can supply authorized final transcript text and decide the
   consent/retention policy.
2. Build a post-call assessment service in shadow mode with one controlled
   outcome taxonomy and persistent raw evaluation records.
3. Label a representative set across customer types/languages; compare against
   Vapi outcome and human adjudication; set per-action thresholds.
4. Ship display-only web and mobile Call Intelligence plus correction capture.
5. Add notification/handoff only after the product has an explicit mobile
   dispatch path and measured reliability. Keep every action code-owned and
   Autopilot OFF.
