import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';

export function setupSocketServer(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: config.cors.methods,
      credentials: config.cors.credentials
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  });

  io.on("connection", (socket) => {
    const clientInfo = {
      id: socket.id,
      origin: socket.handshake.headers.origin,
      transport: socket.conn.transport.name
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