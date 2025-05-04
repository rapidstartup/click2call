import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { authenticateUser } from '../middleware/auth';

interface AuthRequest extends Request {
  user: { id: string };
}

const router = Router();

// Register/update mobile device
router.post('/devices', authenticateUser, async (req: AuthRequest, res: Response) => {
  const { deviceToken, deviceName, platform, appVersion } = req.body;
  const userId = req.user.id;

  try {
    // Validate required fields
    if (!deviceToken || !deviceName || !platform) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('mobile_devices')
      .upsert({
        user_id: userId,
        device_token: deviceToken,
        device_name: deviceName,
        platform,
        app_version: appVersion,
        last_active: new Date().toISOString()
      }, {
        onConflict: 'user_id,device_token'
      })
      .select()
      .single();

    if (error) {
      console.error('Device registration error:', error);
      throw error;
    }
    
    console.log('Device registered successfully:', data);
    res.json(data);
  } catch (error) {
    console.error('Failed to register device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Get user's widgets
router.get('/widgets', authenticateUser, async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('widgets')
      .select(`
        id,
        name,
        type,
        destination,
        routing,
        settings,
        widget_routes (
          id,
          status,
          last_ping,
          mobile_devices (
            device_name,
            platform,
            last_active
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching widgets:', error);
      throw error;
    }

    // Transform data to include shareable URLs
    const transformedData = data?.map(widget => ({
      ...widget,
      shareableUrl: process.env.NODE_ENV === 'development'
        ? `http://localhost:5173/widget/${widget.id}`
        : `https://click2call.ai/widget/${widget.id}`
    }));

    res.json(transformedData);
  } catch (error) {
    console.error('Failed to fetch widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Update device status for a widget
router.post('/widgets/:widgetId/route', authenticateUser, async (req: AuthRequest, res: Response) => {
  const { widgetId } = req.params;
  const { deviceId, status } = req.body;
  const userId = req.user.id;

  try {
    // Validate required fields
    if (!deviceId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify widget ownership
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id')
      .eq('id', widgetId)
      .eq('user_id', userId)
      .single();

    if (widgetError || !widget) {
      console.error('Widget not found or access denied:', widgetError);
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Update or create route
    const { data, error } = await supabase
      .from('widget_routes')
      .upsert({
        widget_id: widgetId,
        device_id: deviceId,
        status,
        last_ping: new Date().toISOString()
      }, {
        onConflict: 'widget_id,device_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating widget route:', error);
      throw error;
    }

    console.log('Widget route updated successfully:', data);
    res.json(data);
  } catch (error) {
    console.error('Failed to update widget route:', error);
    res.status(500).json({ error: 'Failed to update widget route' });
  }
});

// Device heartbeat endpoint
router.post('/heartbeat', authenticateUser, async (req: AuthRequest, res: Response) => {
  const { deviceToken } = req.body;
  const userId = req.user.id;

  try {
    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const { error } = await supabase
      .from('mobile_devices')
      .update({ last_active: new Date().toISOString() })
      .eq('device_token', deviceToken)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating heartbeat:', error);
      throw error;
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to update heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

export default router; 