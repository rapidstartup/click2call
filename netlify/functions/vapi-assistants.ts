import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return response(401, { error: 'Authentication required' });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice('Bearer '.length));
  if (authError || !user) return response(401, { error: 'Invalid authorization token' });

  let apiKey = '';
  try {
    const body = JSON.parse(event.body || '{}') as { api_key?: unknown };
    apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';
  } catch {
    return response(400, { error: 'Invalid request body' });
  }
  if (!apiKey) return response(400, { error: 'VAPI private API key is required' });

  try {
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!vapiResponse.ok) {
      return response(vapiResponse.status === 401 ? 401 : 502, {
        error: vapiResponse.status === 401 ? 'VAPI rejected the API key' : 'VAPI assistant lookup failed',
      });
    }
    const payload = await vapiResponse.json() as unknown;
    if (!Array.isArray(payload)) return response(502, { error: 'VAPI returned an invalid assistant list' });

    const assistants = payload.flatMap((assistant) => {
      if (!assistant || typeof assistant !== 'object' || Array.isArray(assistant)) return [];
      const record = assistant as Record<string, unknown>;
      if (typeof record.id !== 'string' || !record.id) return [];
      return [{
        id: record.id,
        name: typeof record.name === 'string' ? record.name : undefined,
      }];
    });
    return response(200, assistants);
  } catch (error) {
    console.error('VAPI assistant lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    return response(502, { error: 'VAPI assistant lookup failed' });
  }
};
