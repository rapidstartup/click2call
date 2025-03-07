import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';

// Track server statistics
export interface ServerStats {
  totalConnections: number;
  activeConnections: number;
  lastConnection: string | null;
  lastDisconnection: string | null;
  uptime: number;
  startTime: number;
}

const stats: ServerStats = {
  totalConnections: 0,
  activeConnections: 0,
  lastConnection: null,
  lastDisconnection: null,
  uptime: 0,
  startTime: Date.now()
};

export function getServerStats(): ServerStats {
  stats.uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  return { ...stats };
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    transports: ['websocket', 'polling'],  // Allow polling fallback
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    path: '/socket.io/',
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 2048
    },
    // Add proxy support
    allowRequest: (req, callback) => {
      // Log headers for debugging
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

  io.engine.on("initial_headers", (headers, req) => {
    console.log('Socket.IO initial headers:', {
      requestHeaders: req.headers,
      responseHeaders: headers,
      url: req.url
    });
  });

  io.engine.on("connection_error", (err) => {
    console.log('Socket.IO connection error:', {
      type: 'engine_error',
      code: err.code,
      message: err.message,
      context: err.context,
      url: err.req?.url,
      method: err.req?.method,
      headers: err.req?.headers,
      address: err.req?.connection?.remoteAddress,
      origin: err.req?.headers.origin,
      forwarded: err.req?.headers['x-forwarded-for'],
      proto: err.req?.headers['x-forwarded-proto'],
      stack: err.stack
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
      forwarded: {
        proto: socket.handshake.headers['x-forwarded-proto'],
        host: socket.handshake.headers['x-forwarded-host'],
        for: socket.handshake.headers['x-forwarded-for']
      },
      timestamp: new Date().toISOString()
    };
    console.log("Client connected:", clientInfo);

    socket.conn.on("upgrade", (transport) => {
      console.log("Transport upgraded for client:", {
        id: socket.id,
        transport: transport.name,
        timestamp: new Date().toISOString()
      });
    });

    socket.conn.on("packet", (packet) => {
      console.log("Packet received:", {
        id: socket.id,
        type: packet.type,
        data: packet.data,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", (reason) => {
      // Update stats
      stats.activeConnections--;
      stats.lastDisconnection = new Date().toISOString();

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

    socket.on("signal", (data) => {
      console.log("Signal received from", socket.id, ":", data);
      socket.broadcast.emit("signal", {
        ...data,
        from: socket.id
      });
    });

    // Handle transport change
    socket.conn.on("upgrade", (transport) => {
      console.log("Transport upgraded for client:", {
        id: socket.id,
        transport: transport.name
      });
    });
  });

  return io;
}