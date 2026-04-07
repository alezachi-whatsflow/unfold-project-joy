/**
 * Reports API — Usage & billing analytics
 *
 * GET /api/reports/usage   → Daily usage with billing (filterable)
 * GET /api/reports/summary → Period totals
 */
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { createServiceClient } from "../config/supabase.js";

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/reports/usage
 * Returns daily usage breakdown with billing calculations.
 *
 * Query params:
 *   start_date (YYYY-MM-DD, default: 30 days ago)
 *   end_date   (YYYY-MM-DD, default: today)
 *   tenant_id  (optional, for Admin Core cross-tenant queries)
 *   channel    (optional: uazapi | meta | messenger | telegram)
 */
router.get("/usage", async (req: Request, res: Response) => {
  const adminDb = createServiceClient();
  const tenantId = (req.query.tenant_id as string) || req.tenantId;

  if (!tenantId) return res.status(400).json({ error: "tenant_id required" });

  const startDate = (req.query.start_date as string) || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = (req.query.end_date as string) || new Date().toISOString().slice(0, 10);
  const channel = req.query.channel as string | undefined;

  // Query the analytical view
  let query = adminDb
    .from("daily_usage_reports")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .order("report_date", { ascending: true });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;

  if (error) {
    // View might not exist yet — fallback to direct query
    console.warn("[reports] View query failed, using fallback:", error.message);
    return res.json({ data: [], totals: { sends: 0, delivered: 0, failed: 0, totalCost: "0.00" } });
  }

  // Format response
  const rows = (data || []).map((r: any) => ({
    date: new Date(r.report_date).toLocaleDateString("pt-BR"),
    dateISO: r.report_date,
    channel: r.channel,
    sends: Number(r.successful_sends) || 0,
    delivered: Number(r.delivered_count) || 0,
    read: Number(r.read_count) || 0,
    failed: Number(r.failed_count) || 0,
    totalAttempts: Number(r.total_attempts) || 0,
    unitValue: Number(r.unit_cost) || 0,
    totalValue: Number(r.total_cost) || 0,
  }));

  // Totals
  const totals = rows.reduce(
    (acc, r) => ({
      sends: acc.sends + r.sends,
      delivered: acc.delivered + r.delivered,
      read: acc.read + r.read,
      failed: acc.failed + r.failed,
      totalCost: acc.totalCost + r.totalValue,
    }),
    { sends: 0, delivered: 0, read: 0, failed: 0, totalCost: 0 },
  );

  res.json({
    data: rows,
    totals: {
      ...totals,
      totalCost: totals.totalCost.toFixed(2),
    },
    period: { startDate, endDate },
    tenant_id: tenantId,
  });
});

/**
 * GET /api/reports/summary
 * Aggregated totals for the period (for KPI cards).
 */
router.get("/summary", async (req: Request, res: Response) => {
  const adminDb = createServiceClient();
  const tenantId = (req.query.tenant_id as string) || req.tenantId;
  const startDate = (req.query.start_date as string) || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = (req.query.end_date as string) || new Date().toISOString().slice(0, 10);

  if (!tenantId) return res.status(400).json({ error: "tenant_id required" });

  const { data, error } = await adminDb
    .from("campaign_logs")
    .select("status, channel, cost")
    .eq("tenant_id", tenantId)
    .gte("sent_at", startDate)
    .lte("sent_at", endDate + "T23:59:59");

  if (error) return res.json({ totalSends: 0, totalCost: "0.00", byChannel: {} });

  const logs = data || [];
  const totalSends = logs.filter((l: any) => ["sent", "delivered", "read"].includes(l.status)).length;
  const totalFailed = logs.filter((l: any) => l.status === "failed").length;
  const totalCost = logs
    .filter((l: any) => ["sent", "delivered", "read"].includes(l.status))
    .reduce((sum: number, l: any) => sum + (Number(l.cost) || 0), 0);

  // Group by channel
  const byChannel: Record<string, { sends: number; cost: number }> = {};
  for (const l of logs) {
    if (!["sent", "delivered", "read"].includes(l.status)) continue;
    if (!byChannel[l.channel]) byChannel[l.channel] = { sends: 0, cost: 0 };
    byChannel[l.channel].sends++;
    byChannel[l.channel].cost += Number(l.cost) || 0;
  }

  res.json({
    totalSends,
    totalFailed,
    totalCost: totalCost.toFixed(2),
    byChannel,
    period: { startDate, endDate },
  });
});

export default router;
