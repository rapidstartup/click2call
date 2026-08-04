# Unit Economics — click2call voice AI calls

Status: Phase A gate analysis (from CEO plan, plan:154). Findings drive repricing —
**no price change should ship before this is reviewed.**

## Revenue per minute (current pricing)

Plans are flat subscriptions with included minutes; there is **no overage metering
yet** (no Stripe metered usage records wired). Revenue per minute is therefore the
flat price ÷ included allowance, realized only if a customer actually uses their
allowance.

| Plan | Price/mo | Included min | Revenue/min (100% util) | Revenue/min (25% util) |
|------|---------:|-------------:|------------------------:|------------------------:|
| Free | $0 | 30 | $0 | $0 |
| Starter | $9 | 100 | $0.090 | $0.360 |
| Pro | $97 | 1,000 | $0.097 | $0.388 |
| Enterprise | $297 | 5,000 | $0.059 | $0.238 |

## Cost per minute (all-in, Vapi pass-through)

Real-world all-in cost stacks (platform fee + LLM + STT + TTS + telephony), from
Vapi + provider published rates as of 2026:

| Stack | Example | Est. all-in cost/min |
|-------|---------|---------------------:|
| Budget | GPT-4o-mini + Deepgram + PlayHT + Twilio | ~$0.10–0.15 |
| Standard | GPT-4o + Deepgram + ElevenLabs + Twilio | ~$0.15–0.25 |
| Premium | GPT-4o + Deepgram + ElevenLabs Turbo | ~$0.23–0.31 |

Breakdown (typical standard stack): Vapi platform $0.05 + LLM $0.03–0.12 +
STT $0.01–0.04 + TTS $0.02–0.10 + telephony $0.005–0.05.

## The core problem

**At 100% allowance utilization, every paid tier sells minutes below cost:**

- Starter: $0.090/min revenue vs ≥$0.10/min cost — loss on every minute.
- Pro: $0.097/min vs ≥$0.15/min (standard stack) — loss.
- Enterprise: $0.059/min — loss even on the budget stack.

The tiers are only profitable at low utilization (e.g. ~25% utilization on Starter
≈ $0.36/min). This pricing implicitly assumes most customers use a small fraction
of their allowance — which is a bet, not a model.

## Decisions to make

1. **Add overage metering** (metered usage records above included minutes) so heavy
   users pay market rate. This converts the "bet" into a real margin model. Medium
   effort: wire Stripe metered usage on the subscription + meter from `calls`.
2. **Or reprice tiers** so revenue/min ≥ cost/min at a stated utilization
   assumption (pick a target, e.g. 40%).
3. **Or steer the default model stack** to the budget tier (GPT-4o-mini / Haiku +
   Deepgram + PlayHT) to get all-in ≤$0.12/min, then Starter breaks even even at
   100% utilization ($0.09/min is still slightly under — needs ~$0.12+/min price
   or a $12 price).

**Recommended:** (1) overage metering is the durable answer; keep included-minute
allowances as the marketing floor and meter everything above it. Revisit prices
only after that ships.
