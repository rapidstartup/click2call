import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: [
    'https://click2call.ai',
    'https://www.click2call.ai',
    // Add any other domains that need to connect
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://click2call.ai',
      'https://www.click2call.ai'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("signal", (data) => {
    console.log("Signal received:", data);
    // Broadcast to all other clients
    socket.broadcast.emit("signal", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});