import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import {
  createBillingPortalSession,
  createStripeClient,
} from '../../server/stripe';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

type RecordValue = Record<string, unknown>;

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

function firstRow(value: unknown): RecordValue {
  if (Array.isArray(value)) return asRecord(value[0]) || {};
  return asRecord(value) || {};
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numericValue(value: unknown): number {
  return Number(value ?? 0);
}

function appBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim()
    || process.env.URL?.trim()
    || 'https://click2call.ai'
  ).replace(new RegExp('/+$'), '');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return response(405, { error: 'Method not allowed' });
  }

  const authHeader = headerValue(event.headers, 'Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return response(401, { error: 'Missing or invalid authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length),
  );
  if (authError || !user) return response(401, { error: 'Invalid authorization token' });

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase.rpc('get_billing_summary', { p_user_id: user.id });
    if (error) {
      console.error('Billing summary lookup failed:', error.message);
      return response(502, { error: 'Unable to load billing summary' });
    }

    const row = firstRow(data);
    const planId = asNullableString(row.plan_id);
    return response(200, {
      plan: planId
        ? {
          id: planId,
          name: asNullableString(row.plan_name) || planId,
          minutes_allowance: numericValue(row.minutes_allowance),
          recording_retention_days: numericValue(row.recording_retention_days) || 7,
        }
        : { id: 'free', name: 'Free', minutes_allowance: 30, recording_retention_days: 7 },
      subscription_status: asNullableString(row.subscription_status),
      current_period_end: asNullableString(row.current_period_end),
      used_seconds: numericValue(row.used_seconds),
      allowance_seconds: numericValue(row.allowance_seconds),
    });
  }

  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    const customerId = asNullableString(data?.stripe_customer_id);
    if (!customerId) return response(404, { error: 'No active subscription' });

    const session = await createBillingPortalSession({
      stripe: createStripeClient(process.env),
      customerId,
      returnUrl: appBaseUrl() + '/billing',
    });
    return response(200, session);
  } catch (error) {
    console.error('Stripe billing portal creation failed:', error instanceof Error ? error.message : 'Unknown error');
    return response(502, { error: 'Unable to create billing portal session' });
  }
};
