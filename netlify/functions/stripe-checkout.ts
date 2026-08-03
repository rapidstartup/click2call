import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import {
  createStripeClient,
  createCheckoutSession,
  isLiveMode,
  priceIdForMode,
  type PlanLike,
} from '../../server/stripe';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

type PlanRow = PlanLike;

interface RecordValue {
  [key: string]: unknown;
}

function response(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function headerValue(
  headersToRead: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const expected = name.toLowerCase();
  const entry = Object.entries(headersToRead).find(([key]) => key.toLowerCase() === expected);
  return entry?.[1];
}

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as RecordValue;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  const authHeader = headerValue(event.headers, 'Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return response(401, { error: 'Missing or invalid authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length),
  );
  if (authError || !user) return response(401, { error: 'Invalid authorization token' });

  let body: RecordValue | null;
  try {
    body = asRecord(JSON.parse(event.body || '{}'));
  } catch {
    return response(400, { error: 'Invalid request body' });
  }

  const planId = typeof body?.planId === 'string' ? body.planId.trim() : '';
  if (!['starter', 'pro', 'enterprise'].includes(planId)) {
    return response(400, { error: 'Invalid plan' });
  }

  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, stripe_test_price_id, stripe_live_price_id')
      .eq('id', planId)
      .maybeSingle<PlanRow>();

    if (error) throw error;
    if (!data) return response(404, { error: 'Plan not found' });

    const plan: PlanLike = {
      id: data.id,
      name: data.name,
      stripe_test_price_id: data.stripe_test_price_id,
      stripe_live_price_id: data.stripe_live_price_id,
    };
    const live = isLiveMode(process.env);
    if (!priceIdForMode(plan, live)) {
      return response(404, { error: 'Plan is not available in this Stripe mode' });
    }

    const customerEmail = user.email?.trim();
    if (!customerEmail) return response(400, { error: 'A customer email is required' });

    const baseUrl = (
      process.env.PUBLIC_APP_URL?.trim()
      || process.env.URL?.trim()
      || 'https://click2call.ai'
    ).replace(new RegExp('/+$'), '');
    const session = await createCheckoutSession({
      stripe: createStripeClient(process.env),
      plan,
      customerEmail,
      userId: user.id,
      successUrl: baseUrl + '/billing?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: baseUrl + '/pricing',
      isLive: live,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return response(200, { url: session.url });
  } catch (error) {
    console.error('Stripe checkout creation failed:', error instanceof Error ? error.message : 'Unknown error');
    return response(502, { error: 'Unable to create checkout session' });
  }
};