import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import { createLeadEmailSender } from '../../server/email';
import {
  createLeadEscalationStore,
  escalateLead,
  parseEscalationPayload,
} from '../../server/leadEscalation';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function response(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  let body: unknown;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid escalation payload' });
  }

  const payload = parseEscalationPayload(body, event.headers.authorization);
  if (!payload) return response(400, { error: 'Invalid escalation payload' });

  const store = createLeadEscalationStore(supabase);
  const widget = await store.findEscalationWidget(payload.assistantId, payload.apiKey);
  if (!widget) return response(401, { error: 'Widget not found for escalation' });

  try {
    const { result } = await escalateLead({
      store,
      payload,
      widget,
      sendEmail: createLeadEmailSender(process.env),
    });
    return response(200, { result });
  } catch (error) {
    console.error(
      'Lead escalation failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return response(500, { error: 'Lead escalation failed' });
  }
};
