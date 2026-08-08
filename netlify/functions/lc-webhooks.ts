import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { createHighlevelWebhookStore, handleHighlevelWebhook } from '../../server/highlevelWebhook';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function response(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

// SECURITY GAP, not yet closed: this endpoint does not verify that requests
// actually come from HighLevel (no signature check) because their signing
// mechanism for this payload hasn't been confirmed against a real webhook
// delivery yet. Right now anyone who discovers this URL could POST a fake
// uninstall event and delete another account's highlevel_connections row.
// Add signature verification (mirroring stripe-webhook.ts's use of
// Stripe-Signature) before this is relied on for anything beyond dev
// testing — check LeadConnector's webhook docs for the header/algorithm
// once a real delivery has been captured to confirm the format.
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  let body: unknown;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid webhook payload' });
  }

  try {
    const result = await handleHighlevelWebhook({
      store: createHighlevelWebhookStore(supabase),
      body,
    });
    if (result.kind === 'uninstalled') {
      console.log('HighLevel connection removed on uninstall:', result.locationId);
    }
    return response(200, { received: true });
  } catch (error) {
    console.error('HighLevel webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
    // Still 200 — an unhandled shape shouldn't make HighLevel retry/disable the webhook.
    return response(200, { received: true });
  }
};
