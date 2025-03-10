import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';
import { supabase } from './db';

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
    },
    allowRequest: (req, callback) => {
      console.log('Socket.IO handshake request:', {
        headers: req.headers,
        url: req.url,
        method: req.method,
        address: req.connection?.remoteAddress,
        timestamp: new Date().toISOString()
      });
      callback(null, true);
    }
  });

  io.engine.on("headers", (headers, req) => {
    console.log('Socket.IO handshake headers:', {
      requestHeaders: req.headers,
      responseHeaders: headers,
      url: req.url,
      method: req.method,
      address: req.connection.remoteAddress
    });
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
      headers: socket.handshake.headers,
      query: socket.handshake.query,
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
          const { data: widget, error } = await supabase
            .from('widgets')
            .select('*')
            .eq('id', data.widgetId)
            .single();

          if (error || !widget) {
            throw new Error('Widget not found');
          }

          // For VAPI widgets, send VAPI configuration
          if (widget.type === 'vapi' && widget.settings?.vapi_api_key && widget.settings?.vapi_assistant_id) {
            socket.emit('vapi-config', {
              apiKey: widget.settings.vapi_api_key,
              assistantId: widget.settings.vapi_assistant_id
            });
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