import { createServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./infrastructure/config/env.js";
import { logger } from "./infrastructure/logging/logger.js";

const app = createApp();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure appropriately for production
    methods: ["GET", "POST"]
  }
});

// Real-time tracking namespace
const trackingIo = io.of("/tracking");

trackingIo.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected to tracking");

  socket.on("subscribe-shipment", (shipmentId: string) => {
    socket.join(`shipment-${shipmentId}`);
    logger.info({ socketId: socket.id, shipmentId }, "Client subscribed to shipment");
  });

  socket.on("unsubscribe-shipment", (shipmentId: string) => {
    socket.leave(`shipment-${shipmentId}`);
    logger.info({ socketId: socket.id, shipmentId }, "Client unsubscribed from shipment");
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Client disconnected from tracking");
  });
});

// Make io available to routes/controllers
app.set("io", io);
app.set("trackingIo", trackingIo);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "FarmConnect SA backend listening with WebSocket support");
});

