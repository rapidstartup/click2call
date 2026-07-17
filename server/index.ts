import { createServer } from 'http';
import { config } from './config';
import { setupSocketServer } from './socket';
import { createApp } from './app';

export function createServerInstance() {
  const server = createServer(createApp());
  setupSocketServer(server);
  return server;
}

if (require.main === module) {
  const server = createServerInstance();

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.environment} mode`);
    console.log('CORS origins:', config.cors.origins);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
  });
}
