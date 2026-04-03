/**
 * Campaigns API — Bulk operations via BullMQ
 *
 * POST /api/campaigns       → create campaign + enqueue jobs → 202
 * GET  /api/campaigns       → list campaigns (RLS-scoped)
 * POST /api/campaigns/:id/control → stop/continue/delete
 */
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getQueueManager } from "../queues/queueManager.js";

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/campaigns
 * Creates a campaign and enqueues individual message jobs.
 * Returns 202 immediately — Redis Campaign queue processes bulk.
 */
router.post("/", async (req: Request, res: Response) => {
  const { name, instanceName, numbers, message, delayMin, delayMax, provider, templateId } = req.body;

  if (!instanceName || !numbers?.length) {
    return res.status(400).json({ error: "instanceName and numbers[] are required" });
  }

  if (!req.supabase || !req.tenantId) {
    return res.status(500).json({ error: "Auth context missing" });
  }

  // 1. Save campaign record to DB (user-scoped)
  const { data: campaign, error } = await req.supabase
    .from("whatsapp_campaigns")
    .insert({
      name: name || `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
      instance_name: instanceName,
      type: provider === "meta" ? "template" : "simple",
      status: "scheduled",
      total_contacts: numbers.length,
      delay_min: delayMin || 10,
      delay_max: delayMax || 30,
      message_type: provider === "meta" ? "hsm" : "text",
      tenant_id: req.tenantId,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Enqueue bulk job in Campaign Redis (separate from fast-messages)
  const qm = getQueueManager();
  await qm.campaigns.add("bulk-send", {
    campaignId: campaign.id,
    instanceName,
    numbers,
    message: message || null,
    templateId: templateId || null,
    provider: provider || "uazapi",
    delayMin: delayMin || 10,
    delayMax: delayMax || 30,
    tenantId: req.tenantId,
    jwt: req.jwt,
  }, {
    attempts: 1, // Campaigns don't retry the whole batch
    removeOnComplete: true,
  });

  // 3. Return 202 Accepted (processing is async)
  res.status(202).json({
    accepted: true,
    campaignId: campaign.id,
    totalContacts: numbers.length,
    estimatedTime: `${Math.ceil((numbers.length * ((delayMin || 10) + (delayMax || 30)) / 2) / 60)} min`,
  });
});

/**
 * GET /api/campaigns
 * List all campaigns for the authenticated tenant.
 */
router.get("/", async (req: Request, res: Response) => {
  if (!req.supabase) return res.status(500).json({ error: "Database not available" });

  const { data, error } = await req.supabase
    .from("whatsapp_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [] });
});

/**
 * POST /api/campaigns/:id/control
 * Stop, continue, or delete a campaign.
 */
router.post("/:id/control", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // "stop" | "continue" | "delete"

  if (!["stop", "continue", "delete"].includes(action)) {
    return res.status(400).json({ error: "action must be stop, continue, or delete" });
  }

  if (!req.supabase) return res.status(500).json({ error: "Database not available" });

  if (action === "delete") {
    await req.supabase.from("whatsapp_campaigns").delete().eq("id", id);
  } else {
    const statusMap: Record<string, string> = { stop: "stopped", continue: "running" };
    await req.supabase.from("whatsapp_campaigns").update({ status: statusMap[action] }).eq("id", id);
  }

  res.json({ ok: true, action });
});

export default router;
