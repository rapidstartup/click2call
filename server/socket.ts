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
      credentials: config.cors.credentials
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    path: '/socket.io/'
  });

  io.engine.on("connection_error", (err) => {
    console.log('Socket.IO connection error:', {
      code: err.code,
      message: err.message,
      context: err.context,
      req: err.req?.url,
      headers: err.req?.headers
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
      protocol: socket.handshake.headers['x-forwarded-proto'] || 'unknown'
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

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id, "from", socket.handshake.headers.origin);
    });

    socket.on("error", (error) => {
      console.error("Socket error for client", socket.id, ":", error);
    });
  });

  return io;
}