import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

let supabaseClient: ReturnType<typeof createClient>;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );
  }
  return supabaseClient;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(statusCode: number, body: unknown) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

export function validateTwilioWebhookBody(body: unknown) {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const widgetId = typeof parsed.widgetId === 'string' ? parsed.widgetId : '';
  const sipDomain = typeof parsed.sipDomain === 'string' ? parsed.sipDomain : '';
  const accountSid = typeof parsed.accountSid === 'string' ? parsed.accountSid : '';
  const authToken = typeof parsed.authToken === 'string' ? parsed.authToken : '';

  if (!widgetId || !sipDomain || !accountSid || !authToken) {
    return { valid: false, error: 'widgetId, sipDomain, accountSid, and authToken are required' };
  }
  return { valid: true, widgetId, sipDomain, accountSid, authToken };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const validation = validateTwilioWebhookBody(event.body || '{}');
  if (!validation.valid) {
    return response(400, { error: validation.error });
  }

  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return response(401, { error: 'Missing or invalid authorization token' });
  }

  const db = getSupabase();
  const { data: { user }, error: authError } = await db.auth.getUser(authHeader.slice('Bearer '.length));
  if (authError || !user) return response(401, { error: 'Invalid authorization token' });

  try {
    const { data: widget, error: widgetError } = await db
      .from('widgets')
      .select('id, user_id, type')
      .eq('id', validation.widgetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (widgetError) throw widgetError;
    if (!widget) return response(404, { error: 'Widget not found' });
    if (widget.type !== 'siptrunk') return response(400, { error: 'Widget is not a SIP trunk widget' });

    const client = twilio(validation.accountSid, validation.authToken);
    const baseUrl = process.env.VITE_API_URL || 'https://click2call.ai';

    await client.sip.domains(validation.sipDomain).update({
      voiceUrl: `${baseUrl}/twilio/voice/${validation.widgetId}`,
      voiceMethod: 'POST',
      voiceStatusCallbackUrl: `${baseUrl}/twilio/status/${validation.widgetId}`,
      voiceStatusCallbackMethod: 'POST',
    });

    return response(200, { success: true });
  } catch (error) {
    console.error('Twilio webhook configuration failed:', error);
    return response(500, { error: 'Failed to configure Twilio webhooks' });
  }
};