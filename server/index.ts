import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config';
import { setupSocketServer } from './socket';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors(config.cors));

// Serve static files if needed
app.use(express.static(join(__dirname, '../public')));

const httpServer = createServer(app);
const io = setupSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.environment} mode`);
  console.log(`Socket.io server initialized with ${Object.keys(config.cors.origins).length} allowed origins`);
});