import express from 'express';
import { createServer } from 'http';
import https from 'https';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer, getServerStats } from './socket';
import { toPublicVapiConfig, toServerVapiConfig } from './socketSecurity';
import mobileRoutes from './routes/mobile';
import twilioRoutes from './routes/twilio';
import { supabase } from './db';
import { createWidgetCallToken, verifyWidgetCallToken } from './widgetCallToken';
import { isOriginAllowed, normalizeOrigin } from './widgetOrigin';
import { verifyTurnstileToken } from './turnstile';
import { getMaxDurationSeconds, startVapiWebCall } from './vapiProxy';
import type { MeteringRpcClient, VapiProxyResponse } from './vapiProxy';

const app = express();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_WINDOW_MS = 60_000;
const TOKEN_WINDOW_LIMIT = 10;
const tokenWindows = new Map<string, { count: number; resetAt: number }>();
app.use(cors(config.cors));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false }));

// Trust proxy headers since we're behind Nginx
app.set('trust proxy', true);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: config.environment });
});

// Status page endpoint
app.get('/', (req, res) => {
  // Handle both dev and prod paths, considering Nginx proxy
  const paths = [
    path.resolve(__dirname, '..', 'templates', 'status.html'),
    path.resolve(__dirname, 'templates', 'status.html'),
    path.resolve(process.cwd(), 'server', 'templates', 'status.html'),
    path.resolve(process.cwd(), 'templates', 'status.html')
  ];

  // Try each path in sequence until one works
  const tryPath = (index: number) => {
    if (index >= paths.length) {
      console.error('Failed to find status.html in any location');
      res.status(500).send('Error loading status page');
      return;
    }

    res.sendFile(paths[index], (err) => {
      if (err) {
        console.log(`Tried path ${paths[index]}, failed:`, err.message);
        tryPath(index + 1);
      }
    });
  };

  tryPath(0);
});

// Stats API endpoint
app.get('/api/stats', (req, res) => {
  const stats = getServerStats();
  res.json({
    ...stats,
    environment: config.environment
  });
});

// Serve static files if needed
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/mobile', mobileRoutes);
app.use('/twilio', twilioRoutes);

function canIssueWidgetToken(key: string, now = Date.now()): boolean {
  const current = tokenWindows.get(key);
  if (!current || current.resetAt <= now) {
    tokenWindows.set(key, { count: 1, resetAt: now + TOKEN_WINDOW_MS });
    return true;
  }
  if (current.count >= TOKEN_WINDOW_LIMIT) return false;
  current.count += 1;
  return true;
}

function requestVapiWebCall(webCallApiKey: string, body: Record<string, unknown>): Promise<VapiProxyResponse> {
  return new Promise((resolve, reject) => {
    const request = https.request('https://api.vapi.ai/call/web', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${webCallApiKey}`,
        'Content-Type': 'application/json',
      },
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve({
          body: responseBody,
          contentType: response.headers['content-type'],
          statusCode: response.statusCode || 502,
        });
      });
    });

    request.setTimeout(15_000, () => request.destroy(new Error('VAPI request timed out')));
    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

const meteringClient: MeteringRpcClient = {
  rpc: async (functionName, args) => {
    const { data, error } = await supabase.rpc(functionName, args);
    return { data, error };
  },
};

// VAPI's documented proxy architecture keeps provider credentials on the
// server. The browser supplies only its short-lived Click2Call token and the
// SDK request is reduced to the configured assistant for this widget.
app.post('/vapi-proxy/call/web', async (req, res) => {
  const authorization = req.get('authorization');
  const widgetToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
  const tokenPayload = verifyWidgetCallToken(widgetToken, process.env.WIDGET_CALL_TOKEN_SECRET || '');
  const requestOrigin = normalizeOrigin(req.get('origin'));
  if (!tokenPayload || !requestOrigin || tokenPayload.hostOrigin !== requestOrigin) {
    return res.status(401).json({ error: 'Widget call authorization failed' });
  }

  const { data: widget, error } = await supabase
    .from('widgets')
    .select('id, user_id, type, settings')
    .eq('id', tokenPayload.widgetId)
    .maybeSingle();
  if (error || !widget || widget.type !== 'vapi') {
    return res.status(404).json({ error: 'Widget not found' });
  }
  if (!isOriginAllowed(tokenPayload.embeddingOrigin, widget.settings)) {
    return res.status(403).json({ error: 'This website is not authorized for the widget' });
  }

  const serverConfig = toServerVapiConfig(widget.settings);
  const browserConfig = toPublicVapiConfig(widget.settings);
  if (!serverConfig || !browserConfig || !serverConfig.publicApiKey) {
    return res.status(503).json({ error: 'VAPI server configuration is incomplete' });
  }

  const maxDurationSeconds = getMaxDurationSeconds(widget.settings);
  const roomDeleteOnUserLeaveEnabled = typeof req.body?.roomDeleteOnUserLeaveEnabled === 'boolean'
    ? req.body.roomDeleteOnUserLeaveEnabled
    : undefined;

  try {
    const result = await startVapiWebCall({
      webCallApiKey: serverConfig.publicApiKey,
      assistantId: browserConfig.assistantId,
      client: meteringClient,
      maxDurationSeconds,
      roomDeleteOnUserLeaveEnabled,
      requestVapiWebCall,
      userId: widget.user_id,
      widgetId: widget.id,
    });

    if (result.kind === 'cap-reached') {
      const appBase = (process.env.PUBLIC_APP_URL?.trim() || process.env.URL?.trim() || 'https://click2call.ai').replace(/\/$/, '');
      return res.status(402).json({
        error: 'Monthly call allowance reached',
        code: 'cap_reached',
        upgradeUrl: `${appBase}/pricing`,
      });
    }
    if (result.kind === 'metering-error') {
      return res.status(503).json({ error: 'Call metering is temporarily unavailable' });
    }
    if (result.kind === 'provider-error') {
      return res.status(502).json({ error: 'VAPI call initialization failed' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', result.response.contentType || 'application/json');
    return res.status(result.response.statusCode).send(result.response.body);
  } catch (proxyError) {
    console.error('VAPI web-call proxy failed:', proxyError instanceof Error ? proxyError.message : 'Unknown error');
    return res.status(502).json({ error: 'VAPI call initialization failed' });
  }
});

// Public embeds exchange a verified Turnstile challenge for a short-lived token
// bound to both our hosted iframe and the owner's approved customer website.
app.post('/widget-call-token/:widgetId', async (req, res) => {
  const { widgetId } = req.params;
  const tokenSecret = process.env.WIDGET_CALL_TOKEN_SECRET;
  const turnstileSecret = process.env.TURNSTILE_SECRET;
  const hostOrigin = normalizeOrigin(req.get('origin'));
  const embeddingOrigin = normalizeOrigin(req.body?.embeddingOrigin);
  const turnstileToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : '';
  const hostedWidgetHostnames = (process.env.WIDGET_HOSTED_HOSTNAMES || 'click2call.ai')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  if (!tokenSecret || !turnstileSecret) {
    return res.status(503).json({ error: 'Widget calling is not configured' });
  }
  if (!UUID_PATTERN.test(widgetId)) return res.status(404).json({ error: 'Widget not found' });
  if (!hostOrigin || !embeddingOrigin || !turnstileToken) {
    return res.status(403).json({ error: 'Widget authorization failed' });
  }

  const hostHostname = new URL(hostOrigin).hostname.toLowerCase();
  if (!hostedWidgetHostnames.includes(hostHostname)) {
    return res.status(403).json({ error: 'Widget authorization failed' });
  }
  const embeddingHostname = new URL(embeddingOrigin).hostname.toLowerCase();

  const { data: widget, error } = await supabase
    .from('widgets')
    .select('id, type, settings')
    .eq('id', widgetId)
    .maybeSingle();
  if (error || !widget || widget.type !== 'vapi') return res.status(404).json({ error: 'Widget not found' });
  if (!isOriginAllowed(embeddingOrigin, widget.settings)) {
    return res.status(403).json({ error: 'This website is not authorized for the widget' });
  }

  const rateKey = `${widget.id}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  if (!canIssueWidgetToken(rateKey)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many widget authorization requests' });
  }

  const turnstileVerification = await verifyTurnstileToken({
    expectedAction: 'turnstile-spin-v2',
    expectedCdata: widget.id.replace(/-/g, ''),
    // The challenge is rendered by widget.js in the customer's top-level
    // document. Cloudflare therefore attests the embedding hostname instead
    // of us trusting the caller's JSON origin assertion.
    expectedHostname: embeddingHostname,
    remoteIp: req.ip || req.socket.remoteAddress,
    secret: turnstileSecret,
    token: turnstileToken,
  });
  if (!turnstileVerification.success) {
    console.warn('Turnstile rejected widget authorization:', turnstileVerification.reason);
    return res.status(403).json({ error: 'Widget authorization failed' });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  return res.json({
    token: createWidgetCallToken(widget.id, hostOrigin, embeddingOrigin, tokenSecret),
  });
});

// Create HTTP server - we'll let Nginx handle SSL
const server = createServer(app);

// Setup Socket.IO server
setupSocketServer(server);

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.environment} mode`);
  console.log('CORS origins:', config.cors.origins);
});

// Add error handling
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
