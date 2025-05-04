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

    // Add user ID tracking for users who are logged in
    if (socket.handshake.query.userId) {
      // Associate this socket with the user ID for incoming calls
      console.log(`User ${socket.handshake.query.userId} connected with socket ${socket.id}`);
    }

    // Handle widget registration
    socket.on("register", async (data: { type: string; widgetId?: string; token?: string }, callback) => {
      try {
        console.log("Registration request received:", data);
        
        if (data.type === 'widget-visitor') {
          if (!data.widgetId) {
            throw new Error('Widget ID required for visitor registration');
          }

          // Verify widget exists
          const { data: widget, error } = await supabase
            .from('widgets')
            .select('*')
            .eq('id', data.widgetId)
            .single();

          if (error || !widget) {
            throw new Error('Widget not found');
          }

          // Join the widget's room for broadcasts
          socket.join(`widget-${data.widgetId}`);
          console.log(`Client ${socket.id} registered for widget ${data.widgetId}`);
        } 
        else if (data.type === 'widget-receiver') {
          if (!data.token) {
            throw new Error('Token required for receiver registration');
          }

          // Verify token and get user
          const { data: userData, error } = await supabase.auth.getUser(data.token);
          
          if (error || !userData?.user) {
            throw new Error('Invalid token');
          }

          // Get user's widgets
          const { data: widgets, error: widgetsError } = await supabase
            .from('widgets')
            .select('id')
            .eq('user_id', userData.user.id);

          if (widgetsError) {
            throw new Error('Failed to fetch user widgets');
          }

          // Join all widget rooms
          for (const widget of widgets) {
            socket.join(`widget-${widget.id}`);
          }

          console.log(`Mobile client ${socket.id} registered for user ${userData.user.id}`);
        } else {
          throw new Error('Invalid registration type');
        }
        
        // Send success response
        callback({ success: true });
      } catch (error) {
        console.error('Registration error:', error);
        callback({ success: false, error: error.message });
      }
    });

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

    // Handle call acceptance
    socket.on("accept-call", (data) => {
      console.log(`User ${socket.id} accepted call with data:`, data);
      
      // Create a new call session
      const callId = `call-${Date.now()}`;
      activeCalls.set(callId, {
        id: callId,
        startTime: Date.now(),
        participants: [socket.id, data.callerId]
      });
      
      // Update stats
      stats.activeCalls++;
      
      // Notify the caller that the call was accepted
      if (data.callerId) {
        const callerSocket = io.sockets.sockets.get(data.callerId);
        if (callerSocket) {
          callerSocket.emit('call-accepted', {
            callId,
            userId: socket.handshake.query.userId
          });
        }
      }
    });

    // WebRTC signaling handlers
    socket.on('webrtc:offer', ({ callId, offer }) => {
      console.log('Received WebRTC offer from', socket.id, 'for call', callId);
      
      // Validate call session exists
      if (!callId) {
        console.error('No callId provided with WebRTC offer');
        socket.emit('webrtc:error', { error: 'No call ID provided' });
        return;
      }

      const session = activeCalls.get(callId);
      if (!session) {
        console.error('No active call session found for ID:', callId);
        socket.emit('webrtc:error', { error: 'Invalid call session' });
        return;
      }

      // Forward offer to other participant
      const otherParticipant = session.participants.find(id => id !== socket.id);
      if (otherParticipant) {
        const otherSocket = io.sockets.sockets.get(otherParticipant);
        if (otherSocket) {
          console.log('Forwarding WebRTC offer to participant:', otherParticipant);
          otherSocket.emit('webrtc:offer', { callId, offer });
        } else {
          console.error('Other participant socket not found:', otherParticipant);
          socket.emit('webrtc:error', { error: 'Participant not available' });
        }
      } else {
        console.error('No other participant found in session:', session);
        socket.emit('webrtc:error', { error: 'No participant found' });
      }
    });

    socket.on('webrtc:answer', ({ callId, answer }) => {
      console.log('Received WebRTC answer from', socket.id, 'for call', callId);
      const session = activeCalls.get(callId);
      if (session) {
        // Forward answer to other participant
        const otherParticipant = session.participants.find(id => id !== socket.id);
        if (otherParticipant) {
          const otherSocket = io.sockets.sockets.get(otherParticipant);
          if (otherSocket) {
            otherSocket.emit('webrtc:answer', { callId, answer });
          }
        }
      }
    });

    socket.on('webrtc:ice-candidate', ({ callId, candidate }) => {
      console.log('Received ICE candidate from', socket.id, 'for call', callId);
      const session = activeCalls.get(callId);
      if (session) {
        // Forward ICE candidate to other participant
        const otherParticipant = session.participants.find(id => id !== socket.id);
        if (otherParticipant) {
          const otherSocket = io.sockets.sockets.get(otherParticipant);
          if (otherSocket) {
            otherSocket.emit('webrtc:ice-candidate', { callId, candidate });
          }
        }
      }
    });

    // Handle call rejection
    socket.on("reject-call", (data) => {
      console.log(`User ${socket.id} rejected call:`, data);
      
      // Notify the caller
      if (data.callerId) {
        const callerSocket = io.sockets.sockets.get(data.callerId);
        if (callerSocket) {
          callerSocket.emit('call-rejected', {
            reason: data.reason || 'Call rejected by user'
          });
        }
      }
    });

    // Handle call initiation
    socket.on("call:initiate", async (data: { widgetId: string; caller?: { name?: string; email?: string } }, callback) => {
      try {
        console.log("Call initiation request received:", data);

        // Verify widget exists
        const { data: widget, error } = await supabase
          .from('widgets')
          .select('*')
          .eq('id', data.widgetId)
          .single();

        if (error || !widget) {
          throw new Error('Widget not found');
        }

        // Generate unique call ID
        const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create call session
        activeCalls.set(callId, {
          id: callId,
          startTime: Date.now(),
          participants: [socket.id]
        });

        // Update stats
        stats.totalCalls++;
        stats.activeCalls++;

        // Broadcast incoming call to widget room
        socket.to(`widget-${data.widgetId}`).emit('call:incoming', {
          id: callId,
          widgetId: data.widgetId,
          caller: data.caller
        });

        console.log(`Call initiated: ${callId} for widget ${data.widgetId}`);
        
        // Send success response
        callback({ success: true, callId });
      } catch (error) {
        console.error('Call initiation error:', error);
        callback({ success: false, error: error.message });
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