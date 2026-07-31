import { Router, Request } from 'express';
import twilio from 'twilio';
import { supabase } from '../db';
import { authenticateUser } from '../middleware/auth';
import { normalizeAllowedOrigins } from '../widgetOrigin';

const router = Router();

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

// Create a new widget
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { data: widget, error } = await supabase
      .from('widgets')
      .insert({
        ...req.body,
        user_id: req.user.id
      })
      .select('id, name, type, destination, routing, created_at, updated_at')
      .single();

    if (error) throw error;
    res.json(widget);
  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// Add or rotate the browser-safe VAPI public key without returning private settings.
router.patch('/:id/vapi-public-key', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const publicKey = typeof req.body?.vapi_public_key === 'string'
    ? req.body.vapi_public_key.trim()
    : '';
  const allowedOrigins = normalizeAllowedOrigins(req.body?.allowed_origins);
  if (!publicKey && allowedOrigins.length === 0) {
    return res.status(400).json({ error: 'At least one VAPI security setting is required' });
  }

  const { data: existing, error: loadError } = await supabase
    .from('widgets')
    .select('id, type, settings')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (loadError) return res.status(500).json({ error: 'Failed to load widget' });
  if (!existing) return res.status(404).json({ error: 'Widget not found' });
  if (existing.type !== 'vapi') return res.status(400).json({ error: 'Widget is not configured for VAPI' });
  const privateKey = typeof existing.settings?.vapi_api_key === 'string'
    ? existing.settings.vapi_api_key.trim()
    : '';
  if (publicKey && publicKey === privateKey) {
    return res.status(400).json({ error: 'The VAPI public key must be different from the private API key' });
  }

  const settings = { ...existing.settings };
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
    .eq('id', existing.id)
    .eq('user_id', req.user.id)
    .select('id, name, type, destination, routing, created_at, updated_at')
    .single();
  if (error) return res.status(500).json({ error: 'Failed to update widget' });
  return res.json(data);
});

// Configure Twilio webhooks for a widget
router.post('/:id/configure-twilio-webhooks', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { sipDomain, accountSid, authToken } = req.body;

  try {
    // Verify widget ownership
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Initialize Twilio client with user's credentials
    const client = twilio(accountSid, authToken);

    // Get the base URL for webhooks
    const baseUrl = process.env.VITE_API_URL || 'https://your-server.com';

    // Update SIP Domain configuration
    await client.sip.domains(sipDomain).update({
      voiceUrl: `${baseUrl}/twilio/voice/${id}`,
      voiceMethod: 'POST',
      voiceStatusCallbackUrl: `${baseUrl}/twilio/status/${id}`,
      voiceStatusCallbackMethod: 'POST'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring Twilio webhooks:', error);
    res.status(500).json({ error: 'Failed to configure Twilio webhooks' });
  }
});

export default router;
