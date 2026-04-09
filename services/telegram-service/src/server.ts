/**
 * whatsflow-telegram-service
 * Internal microservice for Telegram MTProto (GramJS).
 * NOT exposed publicly — only reachable within Docker network.
 */
import express from "express";
import { config, validateConfig } from "./config";
import {
  generateQrLogin,
  sendMessage,
  getClientStatus,
  disconnectClient,
  restoreAllSessions,
  listClients,
} from "./telegramClient";

validateConfig();

const app = express();
app.use(express.json());

// ── Auth middleware — block all requests without valid internal key ──
app.use((req, res, next) => {
  // Health check is public
  if (req.path === "/health") return next();

  const key = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
  if (key !== config.internalApiKey) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

// ═══ Health Check (public) ═══
app.get("/health", (_req, res) => {
  res.json({ status: "ok", clients: listClients().length });
});

// ═══ Generate QR Code for Telegram login ═══
app.post("/api/telegram/generate-qr", async (req, res) => {
  try {
    const { integration_id, tenant_id, session_id } = req.body;
    if (!integration_id || !tenant_id || !session_id) {
      return res.status(400).json({ error: "integration_id, tenant_id, session_id required" });
    }

    const { qrUrl, promise } = await generateQrLogin(integration_id, tenant_id, session_id);

    if (!qrUrl) {
      return res.status(500).json({ error: "Failed to generate QR code — try again" });
    }

    // Return QR immediately (login completes async)
    res.json({
      qr_url: qrUrl,
      message: "Scan the QR code with Telegram on your phone",
    });

    // Wait for login completion in background (update DB)
    promise
      .then(() => console.log(`[server] Login completed for ${session_id}`))
      .catch((err) => console.error(`[server] Login failed for ${session_id}:`, err.message));
  } catch (err: any) {
    console.error("[server] generate-qr error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ Send Message via Telegram ═══
app.post("/api/telegram/send-message", async (req, res) => {
  try {
    const { integration_id, chat_id, text, reply_to_msg_id } = req.body;
    if (!integration_id || !chat_id || !text) {
      return res.status(400).json({ error: "integration_id, chat_id, text required" });
    }

    const result = await sendMessage(integration_id, chat_id, text, reply_to_msg_id);
    res.json({ ok: true, message_id: result.messageId });
  } catch (err: any) {
    console.error("[server] send-message error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══ Get client status ═══
app.get("/api/telegram/status/:integrationId", (req, res) => {
  const status = getClientStatus(req.params.integrationId);
  res.json(status);
});

// ═══ Disconnect client ═══
app.post("/api/telegram/disconnect", async (req, res) => {
  try {
    const { integration_id } = req.body;
    if (!integration_id) return res.status(400).json({ error: "integration_id required" });

    await disconnectClient(integration_id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ List all active clients ═══
app.get("/api/telegram/clients", (_req, res) => {
  res.json({ clients: listClients() });
});

// ── Start ──
app.listen(config.port, "0.0.0.0", async () => {
  console.log(`[telegram-service] Listening on port ${config.port}`);
  console.log(`[telegram-service] Webhook target: ${config.webhookUrl}`);

  // Restore all saved sessions on startup
  try {
    await restoreAllSessions();
    console.log("[telegram-service] Session restore complete");
  } catch (err) {
    console.error("[telegram-service] Session restore failed:", (err as Error).message);
  }
});
