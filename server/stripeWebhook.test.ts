import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual } from 'node:crypto';
import test from 'node:test';

import {
  processStripeWebhook,
  type StripeWebhookStore,
  type UserPlanUpsert,
} from './stripeWebhook';
import type { PlanLike, StripeWebhookClient } from './stripe';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const webhookSecret = 'whsec_test_secret';
const plans: PlanLike[] = [{
  id: 'starter',
  name: 'Starter',
  stripe_test_price_id: 'price_test_starter',
  stripe_live_price_id: null,
}];

function signedBody(event: Record<string, unknown>): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = createHmac('sha256', webhookSecret)
    .update(timestamp + '.' + rawBody)
    .digest('hex');
  return { rawBody, signature: 't=' + timestamp + ',v1=' + digest };
}

function createStripeClient(): StripeWebhookClient {
  return {
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        if (secret !== webhookSecret) throw new Error('wrong secret');
        const [timestampPart, signaturePart] = signature.split(',');
        const timestamp = timestampPart?.startsWith('t=') ? timestampPart.slice(2) : '';
        const supplied = signaturePart?.startsWith('v1=') ? signaturePart.slice(3) : '';
        const expected = createHmac('sha256', secret)
          .update(timestamp + '.' + rawBody)
          .digest('hex');
        const expectedBuffer = Buffer.from(expected);
        const suppliedBuffer = Buffer.from(supplied);
        if (
          expectedBuffer.length !== suppliedBuffer.length
          || !timingSafeEqual(expectedBuffer, suppliedBuffer)
        ) {
          throw new Error('invalid signature');
        }
        return JSON.parse(rawBody) as unknown;
      },
    },
  };
}

function createStore(): StripeWebhookStore & {
  rows: Map<string, UserPlanUpsert>;
  upserted: UserPlanUpsert[];
} {
  const rows = new Map<string, UserPlanUpsert>();
  const upserted: UserPlanUpsert[] = [];
  return {
    rows,
    upserted,
    async listPlans() {
      return plans;
    },
    async upsertUserPlan(args) {
      const previous = rows.get(args.stripeSubscriptionId);
      if (previous?.status === 'canceled' && args.status !== 'canceled') return previous;
      const next = args.status === null && previous
        ? { ...args, status: previous.status, periodStart: previous.periodStart, periodEnd: previous.periodEnd }
        : args;
      rows.set(args.stripeSubscriptionId, next);
      upserted.push(args);
      return next;
    },
  };
}

function subscriptionEvent(
  type: string,
  object: Record<string, unknown>,
): Record<string, unknown> {
  return { id: 'evt_' + type, type, data: { object } };
}

function subscriptionObject(status: string = 'active'): Record<string, unknown> {
  return {
    object: 'subscription',
    id: 'sub_123',
    customer: 'cus_123',
    status,
    metadata: { user_id: userId, plan_id: 'starter' },
    current_period_start: 1760000000,
    current_period_end: 1762678400,
    items: { data: [{ price: { id: 'price_test_starter' } }] },
  };
}

async function process(
  event: Record<string, unknown>,
  store: StripeWebhookStore,
  signatureOverride?: string,
) {
  const signed = signedBody(event);
  return processStripeWebhook({
    rawBody: signatureOverride === undefined ? signed.rawBody : signed.rawBody + 'tampered',
    signature: signatureOverride === undefined ? signed.signature : signatureOverride,
    secret: webhookSecret,
    stripeClient: createStripeClient(),
    store,
  });
}

test('a valid Stripe signature is accepted and checkout completion writes a subscription mapping', async () => {
  const store = createStore();
  const event = subscriptionEvent('checkout.session.completed', {
    object: 'checkout.session',
    id: 'cs_123',
    customer: 'cus_123',
    client_reference_id: userId,
    metadata: { user_id: userId, plan_id: 'starter' },
    subscription: subscriptionObject(),
    line_items: { data: [{ price: { id: 'price_test_starter' } }] },
  });

  const result = await process(event, store);

  assert.equal(result.kind, 'processed');
  assert.equal(result.planId, 'starter');
  assert.equal(result.status, 'active');
  assert.equal(store.rows.get('sub_123')?.userId, userId);
  assert.equal(store.rows.get('sub_123')?.stripeCustomerId, 'cus_123');
  assert.equal(store.upserted.length, 1);
});

test('missing, invalid, and tampered signatures are unauthorized without a store write', async () => {
  const event = subscriptionEvent('checkout.session.completed', {
    object: 'checkout.session',
    subscription: subscriptionObject(),
    metadata: { user_id: userId, plan_id: 'starter' },
    line_items: { data: [{ price: { id: 'price_test_starter' } }] },
  });
  const signed = signedBody(event);

  for (const signature of [undefined, 't=1,v1=invalid', signed.signature]) {
    const store = createStore();
    const result = await processStripeWebhook({
      rawBody: signature === signed.signature ? signed.rawBody + 'tampered' : signed.rawBody,
      signature,
      secret: webhookSecret,
      stripeClient: createStripeClient(),
      store,
    });
    assert.equal(result.kind, 'unauthorized');
    assert.equal(store.upserted.length, 0);
  }
});

test('customer.subscription.deleted writes canceled and clears the period', async () => {
  const store = createStore();
  const result = await process(
    subscriptionEvent('customer.subscription.deleted', subscriptionObject()),
    store,
  );

  assert.equal(result.kind, 'processed');
  assert.equal(result.status, 'canceled');
  assert.equal(store.rows.get('sub_123')?.status, 'canceled');
  assert.equal(store.rows.get('sub_123')?.periodStart, null);
  assert.equal(store.rows.get('sub_123')?.periodEnd, null);
});

test('invoice.payment_failed marks the subscription past_due', async () => {
  const store = createStore();
  const result = await process(
    subscriptionEvent('invoice.payment_failed', {
      object: 'invoice',
      id: 'in_123',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { user_id: userId, plan_id: 'starter' },
      lines: { data: [{ price: { id: 'price_test_starter' } }] },
    }),
    store,
  );

  assert.equal(result.kind, 'processed');
  assert.equal(result.status, 'past_due');
  assert.equal(store.rows.get('sub_123')?.status, 'past_due');
});

test('invoice.paid leaves the existing status when no subscription status is provided', async () => {
  const store = createStore();
  await process(
    subscriptionEvent('invoice.payment_failed', {
      object: 'invoice',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { user_id: userId, plan_id: 'starter' },
      lines: { data: [{ price: { id: 'price_test_starter' } }] },
    }),
    store,
  );

  const result = await process(
    subscriptionEvent('invoice.paid', {
      object: 'invoice',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { user_id: userId, plan_id: 'starter' },
      lines: { data: [{ price: { id: 'price_test_starter' } }] },
    }),
    store,
  );

  assert.equal(result.kind, 'processed');
  assert.equal(result.status, 'unchanged');
  assert.equal(store.rows.get('sub_123')?.status, 'past_due');
});

test('unknown events are ignored without a plan write', async () => {
  const store = createStore();
  const result = await process(
    subscriptionEvent('customer.created', { object: 'customer', id: 'cus_123' }),
    store,
  );

  assert.equal(result.kind, 'ignored');
  assert.equal(store.upserted.length, 0);
});

test('repeated events are idempotent and a canceled subscription never regresses', async () => {
  const store = createStore();
  const deleted = subscriptionEvent('customer.subscription.deleted', subscriptionObject());
  await process(deleted, store);
  await process(deleted, store);

  const updated = subscriptionEvent(
    'customer.subscription.updated',
    subscriptionObject('active'),
  );
  const result = await process(updated, store);

  assert.equal(result.kind, 'processed');
  assert.equal(store.rows.size, 1);
  assert.equal(store.rows.get('sub_123')?.status, 'canceled');
  assert.equal(store.rows.get('sub_123')?.userId, userId);
  assert.notEqual(store.rows.get('sub_123')?.userId, otherUserId);
});