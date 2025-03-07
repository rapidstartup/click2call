import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer, getServerStats } from './socket';

const app = express();
app.use(cors(config.cors));

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