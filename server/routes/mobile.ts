import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { authenticateUser } from '../middleware/auth';

interface AuthRequest extends Request {
  user: { id: string };
}

const router = Router();

function requiredString(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function widgetName(value: unknown): string | undefined {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== 'object') return undefined;
  const name = (relation as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
}

// Register/update mobile device
router.post('/devices', authenticateUser, async (req: AuthRequest, res: Response) => {
  const deviceToken = requiredString(req.body?.deviceToken, 512);
  const deviceName = requiredString(req.body?.deviceName);
  const appVersion = requiredString(req.body?.appVersion, 50);
  const platform = requiredString(req.body?.platform, 20);
  const userId = req.user.id;

  if (!deviceToken || !deviceName || !appVersion || !platform || !['ios', 'android', 'web'].includes(platform)) {
    return res.status(400).json({ error: 'A valid device token, name, platform, and app version are required' });
  }

  try {
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
      .select('id, device_token, device_name, platform, app_version, last_active')
      .single();

    if (error) throw error;
    res.json(data);
  } catch {
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
        widget_routes (
          id,
          device_id,
          status,
          last_ping
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Get the authenticated user's authoritative VAPI call ledger.
router.get('/calls', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('id, widget_id, status, outcome, duration_s, started_at, updated_at, widgets(name)')
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json((data || []).map((call) => ({
      id: call.id,
      widget_id: call.widget_id,
      widget_name: widgetName(call.widgets),
      status: call.status,
      outcome: call.outcome,
      duration_s: call.duration_s,
      started_at: call.started_at,
      updated_at: call.updated_at,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Update device status for a widget
router.post('/widgets/:widgetId/route', authenticateUser, async (req: AuthRequest, res: Response) => {
  const { widgetId } = req.params;
  const deviceId = requiredString(req.body?.deviceId);
  const status = requiredString(req.body?.status, 20);
  const userId = req.user.id;

  if (!deviceId || !status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'A valid device and route status are required' });
  }

  try {
    // Verify widget ownership
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id')
      .eq('id', widgetId)
      .eq('user_id', userId)
      .single();

    if (widgetError || !widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Verify device ownership because this client bypasses RLS
    const { data: device, error: deviceError } = await supabase
      .from('mobile_devices')
      .select('id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();

    if (deviceError || !device) {
      return res.status(404).json({ error: 'Device not found' });
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

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update widget route' });
  }
});

// Device heartbeat endpoint
router.post('/heartbeat', authenticateUser, async (req: AuthRequest, res: Response) => {
  const { deviceToken } = req.body;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from('mobile_devices')
      .update({ last_active: new Date().toISOString() })
      .eq('device_token', deviceToken)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

export default router;
