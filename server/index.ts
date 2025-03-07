import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer } from './socket';

const app = express();
app.use(cors(config.cors));

// Trust proxy headers since we're behind Nginx
app.set('trust proxy', true);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: config.environment });
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