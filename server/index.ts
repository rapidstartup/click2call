import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer } from './socket';

const app = express();
app.use(cors(config.cors));

// Trust proxy headers since we're behind Nginx
app.set('trust proxy', true);

// Add a simple route for the root path
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Click2Call server is running',
    version: '1.0.0'
  });
});

// Serve static files if needed
app.use(express.static(path.join(__dirname, '../public')));

// Create HTTP or HTTPS server based on environment
let server;
if (config.environment === 'production' && config.ssl.enabled && config.ssl.key && config.ssl.cert) {
  console.log('Starting server in production mode with SSL');
  const sslOptions = {
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert)
  };
  server = createHttpsServer(sslOptions, app);
} else {
  console.log('Starting server in development mode without SSL');
  server = createHttpServer(app);
}

// Setup Socket.IO server
setupSocketServer(server);

console.log('Starting server...');
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.environment} mode`);
  console.log(`Socket.io server initialized with ${config.cors.origins.length} allowed origins`);
  console.log('Server started successfully!');
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