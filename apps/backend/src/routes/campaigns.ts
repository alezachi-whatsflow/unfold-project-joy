/**
 * Campaigns API v2 — Bulk operations via BullMQ + new campaigns table
 *
 * POST /api/campaigns           → Create campaign + enqueue → 202
 * GET  /api/campaigns           → List campaigns (RLS-scoped)
 * GET  /api/campaigns/:id       → Campaign detail with logs
 * POST /api/campaigns/:id/control → pause/resume/cancel
 */
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getQueueManager } from "../queues/queueManager.js";
import { createServiceClient } from "../config/supabase.js";

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/campaigns
 * Creates campaign record + enqueues worker job.
 */
router.post("/", async (req: Request, res: Response) => {
  const {
    name, instanceName, recipients, message, mediaUrl,
    delayMin, delayMax, channel, templateId, templateParams,
    scheduledAt,
  } = req.body;

  if (!instanceName || !recipients?.length) {
    return res.status(400).json({ error: "instanceName and recipients[] are required" });
  }
  if (!req.supabase || !req.tenantId) {
    return res.status(500).json({ error: "Auth context missing" });
  }

  const resolvedChannel = channel || (instanceName.startsWith("meta:") ? "meta" : "uazapi");
  const delayMinMs = (delayMin || 5) * 1000;
  const delayMaxMs = (delayMax || 15) * 1000;

  // 1. Create campaign in new table
  const adminDb = createServiceClient();
  const { data: campaign, error } = await adminDb
    .from("campaigns")
    .insert({
      tenant_id: req.tenantId,
      name: name || `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
      channel: resolvedChannel,
      instance_name: instanceName,
      type: templateId ? "template" : "simple",
      status: scheduledAt ? "scheduled" : "pending",
      message_type: templateId ? "hsm" : mediaUrl ? "media" : "text",
      message_body: message || null,
      media_url: mediaUrl || null,
      template_id: templateId || null,
      template_params: templateParams || {},
      total_recipients: recipients.length,
      delay_min_ms: delayMinMs,
      delay_max_ms: delayMaxMs,
      scheduled_at: scheduledAt || null,
      created_by: req.userId,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Pre-create pending logs for all recipients (batch insert)
  const logs = recipients.map((r: any) => ({
    campaign_id: campaign.id,
    tenant_id: req.tenantId,
    recipient_phone: typeof r === "string" ? r : r.phone,
    recipient_name: typeof r === "string" ? null : r.name || null,
    channel: resolvedChannel,
    status: "pending",
  }));

  // Insert in batches of 500 to avoid payload limits
  for (let i = 0; i < logs.length; i += 500) {
    await adminDb.from("campaign_logs").insert(logs.slice(i, i + 500));
  }

  // 3. Enqueue worker job
  const qm = getQueueManager();
  const jobDelay = scheduledAt ? Math.max(0, new Date(scheduledAt).getTime() - Date.now()) : 0;

  await qm.campaigns.add(
    "campaign-send",
    {
      campaignId: campaign.id,
      tenantId: req.tenantId,
      channel: resolvedChannel,
      instanceName,
      recipients: recipients.map((r: any) => typeof r === "string" ? { phone: r } : r),
      messageBody: message || null,
      mediaUrl: mediaUrl || null,
      templateId: templateId || null,
      templateParams: templateParams || null,
      delayMinMs,
      delayMaxMs,
    },
    {
      delay: jobDelay,
      attempts: 1, // Don't retry entire campaign — individual messages have their own retries
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
    },
  );

  res.status(202).json({
    accepted: true,
    campaignId: campaign.id,
    totalRecipients: recipients.length,
    channel: resolvedChannel,
    scheduled: !!scheduledAt,
    estimatedMinutes: Math.ceil((recipients.length * ((delayMinMs + delayMaxMs) / 2)) / 60000),
  });
});

/**
 * GET /api/campaigns
 */
router.get("/", async (req: Request, res: Response) => {
  if (!req.supabase) return res.status(500).json({ error: "DB unavailable" });

  const { data, error } = await req.supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [] });
});

/**
 * GET /api/campaigns/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
  if (!req.supabase) return res.status(500).json({ error: "DB unavailable" });

  const [{ data: campaign }, { data: logs }] = await Promise.all([
    req.supabase.from("campaigns").select("*").eq("id", req.params.id).single(),
    req.supabase.from("campaign_logs").select("*").eq("campaign_id", req.params.id).order("created_at"),
  ]);

  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const summary = {
    pending: 0, processing: 0, sent: 0, delivered: 0, read: 0, failed: 0,
  };
  for (const log of logs || []) {
    if (log.status in summary) (summary as any)[log.status]++;
  }

  res.json({ campaign, logs: logs || [], summary });
});

/**
 * POST /api/campaigns/:id/control
 */
router.post("/:id/control", async (req: Request, res: Response) => {
  const { action } = req.body;
  if (!["pause", "resume", "cancel", "delete"].includes(action)) {
    return res.status(400).json({ error: "action must be pause, resume, cancel, or delete" });
  }
  if (!req.supabase) return res.status(500).json({ error: "DB unavailable" });

  if (action === "delete") {
    await req.supabase.from("campaigns").delete().eq("id", req.params.id);
  } else {
    const statusMap: Record<string, string> = { pause: "paused", resume: "running", cancel: "cancelled" };
    await req.supabase
      .from("campaigns")
      .update({ status: statusMap[action], updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
  }

  res.json({ ok: true, action });
});

export default router;
