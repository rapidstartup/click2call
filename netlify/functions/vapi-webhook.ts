import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { createVapiWebhookStore, processVapiWebhook } from '../../server/vapiWebhook';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Vapi-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function response(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function headerValue(headersToRead: Record<string, string | undefined>, name: string): string | undefined {
  const expected = name.toLowerCase();
  const entry = Object.entries(headersToRead).find(([key]) => key.toLowerCase() === expected);
  return entry?.[1];
}

function rawBodyFor(event: Parameters<Handler>[0]): string {
  if (!event.body) return '';
  return event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  const rawBody = rawBodyFor(event);
  const signature = headerValue(event.headers, 'Vapi-Signature');

  try {
    const result = await processVapiWebhook({
      rawBody,
      signature,
      store: createVapiWebhookStore(supabase),
    });

    if (result.kind === 'unauthorized') {
      return response(401, { error: 'Invalid webhook signature' });
    }
    if (result.kind === 'invalid') {
      return response(400, { error: 'Invalid webhook payload' });
    }

    return response(200, { received: true });
  } catch (error) {
    console.error('Vapi webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
    return response(500, { error: 'Webhook processing failed' });
  }
};
