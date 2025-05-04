import { Router, Request } from 'express';
import twilio from 'twilio';
import { supabase } from '../db';
import { authenticateUser } from '../middleware/auth';
import { Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';

const router = Router();

// Define the Widget types
type WidgetType = 'call2app' | 'siptrunk' | 'aibot' | 'email' | 'vapi';

// Validate widget type
const isValidWidgetType = (type: string): type is WidgetType => {
  const validTypes = ['call2app', 'siptrunk', 'aibot', 'email', 'vapi'];
  return validTypes.includes(type);
};

// Define the Widget interface
interface Widget {
  id: string;
  name: string;
  user_id: string;
  type: WidgetType;
  destination: string;
  routing: Record<string, any>;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

// Create a new widget
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Received widget creation request:', req.body);
    
    const widgetData = {
      name: req.body.name || 'New Widget',
      user_id: req.user.id,
      type: req.body.type || 'call2app',
      destination: req.body.destination || '',
      routing: req.body.routing || {},
      settings: req.body.settings || {}
    };

    console.log('Creating widget with data:', widgetData);

    // First insert the widget
    const { error: insertError } = await supabase
      .from('widgets')
      .insert(widgetData);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Then fetch the created widget
    const { data: widget, error: fetchError } = await supabase
      .from('widgets')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('name', widgetData.name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      throw fetchError;
    }

    console.log('Successfully created widget:', widget);
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

// Get widget details (public endpoint)
router.get('/public/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Fetching public widget with ID: ${id}`);
    
    // Try to fetch the widget directly without validation
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('id, name, settings')
      .eq('id', id)
      .single();
    
    // If no widget found with the exact ID, check if this is a timestamp-based ID
    if (error || !widget) {
      console.log(`Widget not found with direct ID: ${id}, checking for widget by shareableUrl`);
      
     
      return res.status(404).json({ 
        error: 'Widget not found',
        message: `No widget found with ID: ${id}. Please verify the widget ID or create a new widget.`
      });
    }

    res.json(widget);
  } catch (error) {
    console.error('Error fetching widget:', error);
    res.status(500).json({ 
      error: 'Failed to fetch widget',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initiate a call for a widget
router.post('/:id/call', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body; // Optional caller information

  try {
    // Get widget details
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('*, users!inner(*)')
      .eq('id', id)
      .single();

    if (error || !widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Get user's active WebSocket connection if they're online
    const io = req.app.get('socketio');
    const userSockets = Array.from(io.sockets.sockets.values())
      .filter((socket: Socket) => {
        return socket.handshake.query.userId === widget.user_id;
      });

    if (userSockets.length === 0) {
      // User is not online, could implement fallback here (e.g., email or push notification)
      return res.status(503).json({ 
        error: 'User is not available',
        message: 'The person you are trying to call is not online at the moment.'
      });
    }

    // Send call request to all of the user's active sessions
    userSockets.forEach((socket: Socket) => {
      socket.emit('incoming-call', {
        widgetId: id,
        callerInfo: {
          name: name || 'Anonymous',
          email: email || '',
          timestamp: new Date().toISOString()
        }
      });
    });

    // Log the call request in the database
    await supabase
      .from('call_logs')
      .insert({
        widget_id: id,
        user_id: widget.user_id,
        caller_name: name || 'Anonymous',
        caller_email: email || '',
        status: 'requested'
      });

    res.json({ success: true, message: 'Call request sent' });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

export default router; 