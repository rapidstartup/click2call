import { Router, Request } from 'express';
import twilio from 'twilio';
import { supabase } from '../db';
import { authenticateUser } from '../middleware/auth';

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
      .single();

    if (error) throw error;
    res.json(widget);
  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
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