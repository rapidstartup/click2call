import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { setupSocketServer, getServerStats } from './socket';
import mobileRoutes from './routes/mobile';
import twilioRoutes from './routes/twilio';
import widgetsRoutes from './routes/widgets';
import generateUserTokenRouter from './routes/generateUserToken';

const app = express();

// Configure CORS for development
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3002',
      'http://localhost:19000', // Expo development server
      'http://localhost:19006', // Expo web
      'http://localhost:5173',  // Vite development server
      'exp://192.168.1.80:19000', // Expo on local network
      'https://io.click2call.ai'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

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
app.use('/api/widgets', widgetsRoutes);
app.use('/generateUserToken', generateUserTokenRouter);

// Create HTTP server - we'll let Nginx handle SSL
const server = createServer(app);

// Setup Socket.IO server
const io = setupSocketServer(server);

// Make io available to routes
app.set('socketio', io);

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.environment} mode`);
  console.log('CORS origins:', corsOptions.origin);
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