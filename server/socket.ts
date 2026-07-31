import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';
import { supabase } from './db';
import { canUseWidget, toPublicVapiConfig } from './socketSecurity';
import { verifyWidgetCallToken } from './widgetCallToken';

// Track server statistics
export interface ServerStats {
  totalConnections: number;
  activeConnections: number;
  activeCalls: number;
  totalCalls: number;
  lastConnection: string | null;
  lastDisconnection: string | null;
  uptime: number;
  startTime: number;
}

interface SocketAuth {
  token?: unknown;
  widgetToken?: unknown;
}

const stats: ServerStats = {
  totalConnections: 0,
  activeConnections: 0,
  activeCalls: 0,
  totalCalls: 0,
  lastConnection: null,
  lastDisconnection: null,
  uptime: 0,
  startTime: Date.now()
};

// Track active calls
interface CallSession {
  id: string;
  startTime: number;
  participants: string[];
}

const activeCalls = new Map<string, CallSession>();

export function getServerStats(): ServerStats {
  stats.uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  return { ...stats };
}

interface SignalData {
  type: string;
  timestamp?: number;
  widgetId?: string;
}

export function setupSocketServer(httpServer: HttpServer) {
  console.log('Setting up Socket.IO server with detailed config:', {
    cors: config.cors,
    environment: config.environment,
    port: config.port,
    nodeEnv: process.env.NODE_ENV
  });

  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',  // Allow all origins for the widget
      methods: ['GET', 'POST'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    path: '/socket.io/',
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 2048
    }
  });

  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as SocketAuth | undefined;
    const widgetTokenSecret = process.env.WIDGET_CALL_TOKEN_SECRET || process.env.VITE_SUPABASE_SERVICE_KEY || '';
    const widgetToken = verifyWidgetCallToken(auth?.widgetToken, widgetTokenSecret);
    if (widgetToken) {
      socket.data.widgetId = widgetToken.widgetId;
      return next();
    }

    const bearerHeader = socket.handshake.headers.authorization;
    const token = typeof auth?.token === 'string'
      ? auth.token
      : typeof bearerHeader === 'string' && bearerHeader.startsWith('Bearer ')
        ? bearerHeader.slice('Bearer '.length)
        : null;

    if (!token) {
      return next(new Error('A valid widget call token or user session is required'));
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on("connection", (socket) => {
    // Update stats
    stats.totalConnections++;
    stats.activeConnections++;
    stats.lastConnection = new Date().toISOString();

    const clientInfo = {
      id: socket.id,
      origin: socket.handshake.headers.origin,
      transport: socket.conn.transport.name,
      secure: socket.handshake.secure,
      protocol: socket.handshake.headers['x-forwarded-proto'] || 'unknown',
      address: socket.handshake.address,
      timestamp: new Date().toISOString()
    };
    console.log("Client connected:", clientInfo);

    // Handle call signaling
    socket.on("signal", async (data: SignalData) => {
      console.log("Signal received from", socket.id, ":", data);
      
      if (data.type === 'call-start' && data.widgetId) {
        try {
          // Get widget configuration
          if (socket.data.widgetId && !canUseWidget(socket.data.widgetId, data.widgetId)) {
            throw new Error('Widget token does not authorize this widget');
          }

          let widgetQuery = supabase
            .from('widgets')
            .select('type, settings')
            .eq('id', data.widgetId);
          if (!socket.data.widgetId) {
            widgetQuery = widgetQuery.eq('user_id', socket.data.userId);
          }
          const { data: widget, error } = await widgetQuery.single();

          if (error || !widget) {
            throw new Error('Widget not found');
          }

          // Only the explicitly public VAPI key may be sent to a browser.
          if (widget.type === 'vapi') {
            const publicConfig = toPublicVapiConfig(widget.settings);
            if (!publicConfig) throw new Error('VAPI public key is not configured');
            socket.emit('vapi-config', publicConfig);
          }

          // Update stats and create call session
          stats.totalCalls++;
          stats.activeCalls++;
          
          const callId = `call-${Date.now()}`;
          activeCalls.set(callId, {
            id: callId,
            startTime: Date.now(),
            participants: [socket.id]
          });

          // Emit call established event
          socket.emit('call-established');
        } catch (error) {
          console.error('Error handling call start:', error);
          socket.emit('call-status', {
            status: 'error',
            message: 'Failed to start call'
          });
        }
      } else if (data.type === 'call-end') {
        stats.activeCalls = Math.max(0, stats.activeCalls - 1);
        
        // Find and remove the call session
        for (const [callId, session] of activeCalls.entries()) {
          if (session.participants.includes(socket.id)) {
            activeCalls.delete(callId);
            socket.emit('call-ended');
            break;
          }
        }
      }
    });

    socket.on("disconnect", (reason) => {
      // Update stats
      stats.activeConnections--;
      stats.lastDisconnection = new Date().toISOString();

      // Clean up any active calls for this socket
      for (const [callId, session] of activeCalls.entries()) {
        if (session.participants.includes(socket.id)) {
          activeCalls.delete(callId);
          stats.activeCalls = Math.max(0, stats.activeCalls - 1);
          break;
        }
      }

      console.log("Client disconnected:", {
        id: socket.id,
        origin: socket.handshake.headers.origin,
        reason,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error for client:", {
        id: socket.id,
        error: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  });

  return io;
}
