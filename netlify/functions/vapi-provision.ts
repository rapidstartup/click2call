import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

import {
  appBaseUrl,
  createVapiProvisionStore,
  provisionAllUserWidgets,
  provisionWidget,
} from '../../server/vapiProvision';
import type { ProvisionFetchLike } from '../../server/vapiProvision';

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

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || '{}') as unknown;
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return response(400, { error: 'Invalid request body' });
  }

  const widgetId = typeof body.widget_id === 'string' && body.widget_id.trim()
    ? body.widget_id.trim()
    : null;
  const all = body.all === true;
  if (!widgetId && !all) return response(400, { error: 'widget_id or all is required' });

  try {
    const store = createVapiProvisionStore(supabase);
    const baseUrl = appBaseUrl(process.env);
    const fetchImpl = globalThis.fetch as unknown as ProvisionFetchLike;

    if (widgetId) {
      const result = await provisionWidget({
        store,
        fetchImpl,
        widgetId,
        userId: user.id,
        baseUrl,
      });
      if (result.ok) return response(200, { ok: true, widget_id: result.widgetId });
      const status = result.error === 'Widget not found' ? 404 : 502;
      return response(status, { error: result.error || 'Lead capture provisioning failed' });
    }

    const results = await provisionAllUserWidgets({
      store,
      fetchImpl,
      userId: user.id,
      baseUrl,
    });
    return response(200, { ok: true, results });
  } catch (error) {
    console.error(
      'Lead capture provisioning failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return response(500, { error: 'Lead capture provisioning failed' });
  }
};
