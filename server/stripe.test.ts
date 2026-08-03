import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBillingPortalSession,
  createCheckoutSession,
  getPlanByPriceId,
  priceIdForMode,
  type BillingPortalSessionCreateParams,
  type CheckoutSessionCreateParams,
  type PlanLike,
  type StripeCheckoutClient,
} from './stripe';

const plan: PlanLike = {
  id: 'pro',
  name: 'Professional',
  stripe_test_price_id: 'price_test_pro',
  stripe_live_price_id: 'price_live_pro',
};

test('priceIdForMode selects the price for the requested Stripe mode', () => {
  assert.equal(priceIdForMode(plan, false), 'price_test_pro');
  assert.equal(priceIdForMode(plan, true), 'price_live_pro');
});

test('getPlanByPriceId resolves either configured price to its plan', () => {
  assert.equal(getPlanByPriceId([plan], 'price_test_pro'), plan);
  assert.equal(getPlanByPriceId([plan], 'price_live_pro'), plan);
  assert.equal(getPlanByPriceId([plan], 'price_unknown'), null);
});

test('createCheckoutSession creates a subscription session with the selected price and metadata', async () => {
  const requests: CheckoutSessionCreateParams[] = [];
  const stripe: StripeCheckoutClient = {
    checkout: {
      sessions: {
        async create(params) {
          requests.push(params);
          return { id: 'cs_test_123', url: 'https://checkout.stripe.test/cs_test_123' };
        },
      },
    },
  };

  const session = await createCheckoutSession({
    stripe,
    plan,
    customerEmail: 'owner@example.com',
    userId: 'user-123',
    successUrl: 'https://click2call.ai/billing?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://click2call.ai/pricing',
    isLive: false,
  });

  assert.deepEqual(session, {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.test/cs_test_123',
  });
  assert.deepEqual(requests, [{
    mode: 'subscription',
    line_items: [{ price: 'price_test_pro', quantity: 1 }],
    customer_email: 'owner@example.com',
    client_reference_id: 'user-123',
    metadata: { user_id: 'user-123', plan_id: 'pro' },
    subscription_data: { metadata: { user_id: 'user-123', plan_id: 'pro' } },
    success_url: 'https://click2call.ai/billing?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://click2call.ai/pricing',
    allow_promotion_codes: true,
  }]);
});

test('createCheckoutSession can select the live price', async () => {
  let request: CheckoutSessionCreateParams | undefined;
  const stripe: StripeCheckoutClient = {
    checkout: {
      sessions: {
        async create(params) {
          request = params;
          return { id: 'cs_live_123', url: 'https://checkout.stripe.com/cs_live_123' };
        },
      },
    },
  };

  await createCheckoutSession({
    stripe,
    plan,
    customerEmail: 'owner@example.com',
    userId: 'user-123',
    successUrl: 'https://click2call.ai/billing',
    cancelUrl: 'https://click2call.ai/pricing',
    isLive: true,
  });

  assert.equal(request?.line_items[0].price, 'price_live_pro');
});

test('createBillingPortalSession creates a portal session with the customer and return URL', async () => {
  const requests: BillingPortalSessionCreateParams[] = [];
  const stripe: StripeCheckoutClient = {
    checkout: {
      sessions: {
        async create() {
          return { id: 'unused', url: null };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          requests.push(params);
          return { url: 'https://billing.stripe.test/session_123' };
        },
      },
    },
  };

  const session = await createBillingPortalSession({
    stripe,
    customerId: 'cus_test_123',
    returnUrl: 'https://click2call.ai/billing',
  });

  assert.deepEqual(session, { url: 'https://billing.stripe.test/session_123' });
  assert.deepEqual(requests, [{
    customer: 'cus_test_123',
    return_url: 'https://click2call.ai/billing',
  }]);
});
