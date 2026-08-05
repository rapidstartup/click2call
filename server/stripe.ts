import { createRequire } from 'node:module';

export interface PlanLike {
  id: string;
  name: string;
  stripe_test_price_id?: string | null;
  stripe_live_price_id?: string | null;
}

export interface CheckoutSessionLike {
  id: string;
  url: string | null;
}

export interface CheckoutSessionCreateParams {
  mode: 'subscription';
  line_items: Array<{ price: string; quantity: 1 }>;
  customer_email: string;
  client_reference_id: string;
  metadata: {
    user_id: string;
    plan_id: string;
  };
  subscription_data: {
    metadata: {
      user_id: string;
      plan_id: string;
    };
  };
  success_url: string;
  cancel_url: string;
  allow_promotion_codes: true;
}

export interface BillingPortalSessionCreateParams {
  customer: string;
  return_url: string;
}

export interface BillingPortalSessionLike {
  url: string | null;
}

export interface StripeBillingPortalClient {
  billingPortal: {
    sessions: {
      create(params: BillingPortalSessionCreateParams): Promise<BillingPortalSessionLike>;
    };
  };
}

export interface StripeCheckoutClient {
  checkout: {
    sessions: {
      create(params: CheckoutSessionCreateParams): Promise<CheckoutSessionLike>;
    };
  };
  billingPortal?: StripeBillingPortalClient['billingPortal'];
}

export interface StripeWebhookClient {
  webhooks: {
    constructEvent(rawBody: string, signature: string, secret: string): unknown;
  };
}

export type StripeClient = StripeCheckoutClient & StripeBillingPortalClient & StripeWebhookClient;

type StripeConstructor = new (
  secretKey: string,
  options: { apiVersion: '2024-12-18.acacia' },
) => StripeClient;

const stripeRequire = createRequire(__filename);

function loadStripeConstructor(): StripeConstructor {
  const loaded = stripeRequire('stripe') as StripeConstructor | { default?: StripeConstructor };
  const constructor = typeof loaded === 'function' ? loaded : loaded.default;
  if (!constructor) throw new Error('Stripe package is unavailable');
  return constructor;
}

export function getStripeSecretKey(
  env: Record<string, string | undefined> = process.env,
): string {
  return (env.STRIPE_MODE?.trim() === 'test'
    ? env.STRIPE_TEST_SECRET
    : env.STRIPE_LIVE_SECRET)?.trim() || '';
}

export function isLiveMode(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.STRIPE_MODE?.trim() !== 'test';
}

export function createStripeClient(
  env: Record<string, string | undefined> = process.env,
): StripeClient {
  const Stripe = loadStripeConstructor();
  return new Stripe(getStripeSecretKey(env), {
    apiVersion: '2024-12-18.acacia',
  });
}

export function priceIdForMode(plan: PlanLike, live: boolean): string | null {
  const priceId = live ? plan.stripe_live_price_id : plan.stripe_test_price_id;
  return typeof priceId === 'string' && priceId.trim() ? priceId.trim() : null;
}

export function getPlanByPriceId(
  plans: readonly PlanLike[],
  priceId: string | null | undefined,
): PlanLike | null {
  const normalizedPriceId = typeof priceId === 'string' ? priceId.trim() : '';
  if (!normalizedPriceId) return null;

  return plans.find((plan) => (
    priceIdForMode(plan, false) === normalizedPriceId
      || priceIdForMode(plan, true) === normalizedPriceId
  )) || null;
}

export async function createCheckoutSession(input: {
  stripe: StripeCheckoutClient;
  plan: PlanLike;
  customerEmail: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  isLive?: boolean;
}): Promise<CheckoutSessionLike> {
  const priceId = priceIdForMode(input.plan, input.isLive ?? false);
  if (!priceId) throw new Error('The selected plan has no Stripe price for this mode');

  const session = await input.stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: input.customerEmail,
    client_reference_id: input.userId,
    metadata: {
      user_id: input.userId,
      plan_id: input.plan.id,
    },
    subscription_data: {
      metadata: {
        user_id: input.userId,
        plan_id: input.plan.id,
      },
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
  });

  return { id: session.id, url: session.url };
}

export async function createBillingPortalSession(input: {
  stripe: StripeCheckoutClient;
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const session = await input.stripe.billingPortal?.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  if (!session?.url) throw new Error('Stripe did not return a billing portal URL');
  return { url: session.url };
}
