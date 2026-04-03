/**
 * Messages API — Enqueue-first architecture
 *
 * POST /api/messages/send     → enqueue in fast-messages → 202 Accepted
 * POST /api/messages/send-media → enqueue with media → 202 Accepted
 * GET  /api/messages/:jid     → fetch from Supabase (user-scoped RLS)
 */
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getQueueManager } from "../queues/queueManager.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/messages/send
 * Enqueues a text message for sending via uazapi/Meta.
 * Returns 202 immediately — worker processes asynchronously.
 */
router.post("/send", async (req: Request, res: Response) => {
  const { instanceName, recipientJid, text, isGroup } = req.body;

  if (!instanceName || !recipientJid || !text?.trim()) {
    return res.status(400).json({ error: "instanceName, recipientJid and text are required" });
  }

  const qm = getQueueManager();
  const jobId = await qm.enqueueMessage({
    type: "outgoing_message",
    instance: instanceName,
    tenantId: req.tenantId,
    payload: {
      recipientJid,
      text: text.trim(),
      isGroup: isGroup || false,
      userId: req.userId,
      jwt: req.jwt, // Worker will use this to create scoped Supabase client
    },
    timestamp: Date.now(),
  });

  res.status(202).json({ accepted: true, jobId, message: "Queued for delivery" });
});

/**
 * POST /api/messages/send-media
 * Enqueues a media message (image, document, audio, video).
 */
router.post("/send-media", async (req: Request, res: Response) => {
  const { instanceName, recipientJid, mediaType, mediaUrl, caption, isGroup } = req.body;

  if (!instanceName || !recipientJid || !mediaUrl) {
    return res.status(400).json({ error: "instanceName, recipientJid and mediaUrl are required" });
  }

  const qm = getQueueManager();
  const jobId = await qm.enqueueMessage({
    type: "outgoing_message",
    instance: instanceName,
    tenantId: req.tenantId,
    payload: {
      recipientJid,
      mediaType: mediaType || "document",
      mediaUrl,
      caption: caption || "",
      isGroup: isGroup || false,
      userId: req.userId,
      jwt: req.jwt,
    },
    timestamp: Date.now(),
  });

  res.status(202).json({ accepted: true, jobId });
});

/**
 * GET /api/messages/:jid
 * Fetches message history for a conversation.
 * Uses user's JWT → Supabase RLS enforces tenant isolation.
 */
router.get("/:jid", async (req: Request, res: Response) => {
  const { jid } = req.params;
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;

  if (!req.supabase) return res.status(500).json({ error: "Database not available" });

  const { data, error } = await req.supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("remote_jid", jid)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ data: (data || []).reverse(), total: data?.length || 0 });
});

export default router;
