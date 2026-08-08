import { Handler } from '@netlify/functions';
import { createClient, User } from '@supabase/supabase-js';

import { getAllowedOrigins, normalizeAllowedOrigins } from '../../server/widgetOrigin';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json',
};

interface WidgetRow {
  created_at: string;
  destination: string | null;
  id: string;
  name: string;
  routing: unknown;
  settings?: Record<string, unknown> | null;
  type: string;
  updated_at: string;
}

function safeWidget(widget: WidgetRow) {
  const publicKey = typeof widget.settings?.vapi_public_key === 'string'
    ? widget.settings.vapi_public_key.trim()
    : '';
  const privateKey = typeof widget.settings?.vapi_api_key === 'string'
    ? widget.settings.vapi_api_key.trim()
    : '';
  const allowedOrigins = getAllowedOrigins(widget.settings);
  return {
    id: widget.id,
    name: widget.name,
    type: widget.type,
    destination: widget.destination,
    routing: widget.routing,
    created_at: widget.created_at,
    updated_at: widget.updated_at,
    allowed_origins: allowedOrigins,
    needs_vapi_public_key: widget.type === 'vapi'
      && (!publicKey || publicKey === privateKey),
    needs_allowed_origins: widget.type === 'vapi' && allowedOrigins.length === 0,
  };
}

function response(statusCode: number, body: unknown) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return response(401, { error: 'Missing or invalid authorization token' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice('Bearer '.length));
  if (authError || !user) return response(401, { error: 'Invalid authorization token' });

  try {
    return await handleRequest(event.httpMethod, event.body, user, event.queryStringParameters?.id);
  } catch (error) {
    console.error('Widget request failed:', error);
    return response(500, { error: 'Internal server error' });
  }
};

async function handleRequest(method: string, rawBody: string | null, user: User, queryId?: string) {
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('widgets')
      .select('id, name, type, destination, routing, settings, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return response(200, (data as WidgetRow[]).map(safeWidget));
  }

  if (method === 'POST') {
    const body = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    if (body.type === 'vapi') {
      const settings = body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
        ? body.settings as Record<string, unknown>
        : {};
      const publicKey = typeof settings.vapi_public_key === 'string' ? settings.vapi_public_key.trim() : '';
      const privateKey = typeof settings.vapi_api_key === 'string' ? settings.vapi_api_key.trim() : '';
      const allowedOrigins = normalizeAllowedOrigins(settings.allowed_origins);
      if (!publicKey || !privateKey || publicKey === privateKey || allowedOrigins.length === 0) {
        return response(400, { error: 'VAPI widgets require distinct private and public keys plus an allowed website origin' });
      }
      body.settings = { ...settings, vapi_api_key: privateKey, vapi_public_key: publicKey, allowed_origins: allowedOrigins };
    }
    const { data, error } = await supabase
      .from('widgets')
      .insert({ ...body, user_id: user.id })
      .select('id, name, type, destination, routing, settings, created_at, updated_at')
      .single();
    if (error) throw error;
    return response(200, safeWidget(data as WidgetRow));
  }

  if (method === 'PATCH') {
    const body = JSON.parse(rawBody || '{}') as {
      allowed_origins?: unknown;
      vapi_public_key?: unknown;
      widget_id?: unknown;
    };
    const widgetId = typeof body.widget_id === 'string' ? body.widget_id : queryId;
    const publicKey = typeof body.vapi_public_key === 'string' ? body.vapi_public_key.trim() : '';
    const allowedOrigins = normalizeAllowedOrigins(body.allowed_origins);
    if (!widgetId || (!publicKey && allowedOrigins.length === 0)) {
      return response(400, { error: 'Widget ID and at least one security setting are required' });
    }

    const { data: existing, error: loadError } = await supabase
      .from('widgets')
      .select('id, type, settings')
      .eq('id', widgetId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!existing) return response(404, { error: 'Widget not found' });
    if (existing.type !== 'vapi') return response(400, { error: 'Only VAPI widgets accept a VAPI public key' });
    const privateKey = typeof existing.settings?.vapi_api_key === 'string'
      ? existing.settings.vapi_api_key.trim()
      : '';
    if (publicKey && publicKey === privateKey) {
      return response(400, { error: 'The VAPI public key must be different from the private API key' });
    }

    const settings = { ...(existing.settings as Record<string, unknown>) };
    if (publicKey) {
      settings.vapi_public_key = publicKey;
      delete settings.vapi_public_key_required;
    }
    if (allowedOrigins.length > 0) {
      settings.allowed_origins = allowedOrigins;
      delete settings.allowed_origins_required;
    }
    const { data, error } = await supabase
      .from('widgets')
      .update({ settings })
      .eq('id', widgetId)
      .eq('user_id', user.id)
      .select('id, name, type, destination, routing, settings, created_at, updated_at')
      .single();
    if (error) throw error;
    return response(200, safeWidget(data as WidgetRow));
  }

  return response(405, { error: 'Method not allowed' });
}
