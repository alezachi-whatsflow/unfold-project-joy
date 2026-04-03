/**
 * Whatsflow Backend Horizontal — Entry Point
 *
 * Architecture:
 * ┌──────────┐     ┌──────────────┐     ┌─────────────┐
 * │ Frontend │────>│   Backend    │────>│  Supabase   │
 * │  (React) │     │  (Express)   │     │  (Cofre)    │
 * └──────────┘     │              │     └─────────────┘
 *                  │  ┌─────────┐ │
 *                  │  │ BullMQ  │ │     ┌─────────────┐
 *                  │  │ Queues  │─┼────>│    Redis     │
 *                  │  └─────────┘ │     │  (3 inst.)  │
 *                  │              │     └─────────────┘
 *                  │  ┌─────────┐ │
 *                  │  │Socket.io│ │     ┌─────────────┐
 *                  │  │Realtime │─┼────>│   OpenAI    │
 *                  │  └─────────┘ │     │   Whisper   │
 *                  └──────────────┘     └─────────────┘
 */
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import { getQueueManager } from "./queues/queueManager.js";
import messagesRouter from "./routes/messages.js";
import campaignsRouter from "./routes/campaigns.js";
import googleAuthRouter from "./routes/googleAuth.js";
import { setSocketIO } from "./services/realtimeEmitter.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.BACKEND_PORT || 3001);

// ── Middleware ──
app.use(express.json({ limit: "10mb" }));

// ── Socket.io (Realtime for frontend) ──
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      "https://unfold-project-joy-production.up.railway.app",
      "https://app.whatsflow.com.br",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  socket.on("join-tenant", (tenantId: string) => {
    socket.join(`tenant:${tenantId}`);
  });
  socket.on("disconnect", () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

// ── Connect Socket.io to Realtime Emitter ──
setSocketIO(io);

// ── Queue Manager ──
const queueManager = getQueueManager();

// ── API Routes ──
app.use("/api/messages", messagesRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/auth/google", googleAuthRouter);

// ── Health Check ──
app.get("/health", async (_req, res) => {
  const health = await queueManager.getHealth();
  res.json({
    service: "whatsflow-backend",
    version: "1.0.0",
    uptime: process.uptime(),
    queues: health,
  });
});

// ── API Routes (to be expanded) ──
app.get("/api/queues/status", async (_req, res) => {
  const health = await queueManager.getHealth();
  res.json(health);
});

// ── Start ──
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║     WHATSFLOW BACKEND HORIZONTAL v1.0.0         ║
║══════════════════════════════════════════════════║
║                                                  ║
║  HTTP API:    http://localhost:${PORT}              ║
║  Socket.io:   ws://localhost:${PORT}               ║
║  Health:      http://localhost:${PORT}/health       ║
║                                                  ║
║  Queues:                                         ║
║    fast-messages   → Redis Core :16379           ║
║    ai-processing   → Redis Core :16379           ║
║    msg:scheduled   → Redis Schedule :16380       ║
║    msg:campaign    → Redis Campaign :16381       ║
║                                                  ║
║  Status: READY                                   ║
╚══════════════════════════════════════════════════╝
  `);
});

// ── Graceful Shutdown ──
const shutdown = async () => {
  console.log("[server] Shutting down gracefully...");
  await queueManager.shutdown();
  io.close();
  httpServer.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
