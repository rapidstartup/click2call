import express from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { getServerStats } from './socket';
import mobileRoutes from './routes/mobile';
import twilioRoutes from './routes/twilio';
import widgetRoutes from './routes/widgets';

export function createApp() {
  const app = express();

  app.use(cors(config.cors));
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: config.environment });
  });

  app.get('/', (req, res) => {
    const paths = [
      path.resolve(__dirname, '..', 'templates', 'status.html'),
      path.resolve(__dirname, 'templates', 'status.html'),
      path.resolve(process.cwd(), 'server', 'templates', 'status.html'),
      path.resolve(process.cwd(), 'templates', 'status.html')
    ];

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

  app.get('/api/stats', (req, res) => {
    res.json({
      ...getServerStats(),
      environment: config.environment
    });
  });

  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/mobile', mobileRoutes);
  app.use('/twilio', twilioRoutes);
  app.use('/api/widgets', widgetRoutes);

  return app;
}
