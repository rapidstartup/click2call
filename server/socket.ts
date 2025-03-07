import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';

export function setupSocketServer(httpServer: HttpServer) {
  console.log('Setting up Socket.IO server with config:', {
    cors: config.cors,
    environment: config.environment
  });

  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: config.cors.methods,
      credentials: config.cors.credentials,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    path: '/socket.io/',
    maxHttpBufferSize: 1e8,
    // Trust the X-Forwarded-* headers from Nginx
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 2048 // Size in bytes to compress
    }
  });

  // Log all engine level errors
  io.engine.on("connection_error", (err) => {
    console.log('Socket.IO connection error:', {
      type: 'engine_error',
      code: err.code,
      message: err.message,
      context: err.context,
      req: err.req?.url,
      headers: err.req?.headers,
      stack: err.stack
    });
  });

  io.on("connection", (socket) => {
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
      }
    };
    console.log("Client connected:", clientInfo);

    socket.on("signal", (data) => {
      console.log("Signal received from", socket.id, ":", data);
      // Broadcast to all other clients
      socket.broadcast.emit("signal", {
        ...data,
        from: socket.id
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", {
        id: socket.id,
        origin: socket.handshake.headers.origin,
        reason
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error for client:", {
        id: socket.id,
        error: error.toString(),
        stack: error.stack
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