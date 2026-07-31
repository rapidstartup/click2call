import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer, getServerStats } from './socket';
import mobileRoutes from './routes/mobile';
import twilioRoutes from './routes/twilio';
import { supabase } from './db';
import { createWidgetCallToken } from './widgetCallToken';

const app = express();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

// Public embeds exchange their public widget ID for a short-lived, widget-scoped
// socket token. The token authorizes one widget only and contains no provider keys.
app.get('/widget-call-token/:widgetId', async (req, res) => {
  const { widgetId } = req.params;
  const tokenSecret = process.env.WIDGET_CALL_TOKEN_SECRET || process.env.VITE_SUPABASE_SERVICE_KEY;
  if (!tokenSecret) {
    return res.status(503).json({ error: 'Widget calling is not configured' });
  }
  if (!UUID_PATTERN.test(widgetId)) {
    return res.status(404).json({ error: 'Widget not found' });
  }

  const { data: widget, error } = await supabase
    .from('widgets')
    .select('id')
    .eq('id', widgetId)
    .maybeSingle();
  if (error || !widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ token: createWidgetCallToken(widget.id, tokenSecret) });
});
