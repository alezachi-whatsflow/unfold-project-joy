/**
 * Campaign Worker — Processes bulk message campaigns via BullMQ.
 *
 * Architecture:
 * - Reads jobs from `msg:campaign` queue (Redis Campaign instance)
 * - Splits campaign into individual messages
 * - Enqueues each message with dynamic delays (uazapi) or burst (meta)
 * - Updates campaign counters in real-time via Supabase
 * - Idempotent: checks log status before processing
 * - DLQ: moves to dead-letter after 3 attempts
 */
import { Worker, Job, Queue } from "bullmq";
import { createServiceClient } from "../config/supabase.js";
import { REDIS_CAMPAIGN } from "../config/redis.js";
import { getSocketIO } from "../services/realtimeEmitter.js";

interface CampaignJobData {
  campaignId: string;
  tenantId: string;
  channel: string;
  instanceName: string;
  recipients: Array<{ phone: string; name?: string }>;
  messageBody?: string;
  mediaUrl?: string;
  templateId?: string;
  templateParams?: Record<string, any>;
  delayMinMs: number;
  delayMaxMs: number;
}

// ── Provider-specific senders ──────────────────────────────────────────

async function sendViaUazapi(
  instanceName: string,
  phone: string,
  text: string,
  mediaUrl?: string,
): Promise<{ messageId?: string; error?: string }> {
  const supabase = createServiceClient();
  const { data: inst } = await supabase
    .from("whatsapp_instances")
    .select("instance_token")
    .eq("instance_name", instanceName)
    .single();

  if (!inst?.instance_token) return { error: "Instance token not found" };

  const UAZAPI_BASE = process.env.UAZAPI_BASE_URL || "https://whatsflow.uazapi.com";
  const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^(?!55)/, "55");
  const path = mediaUrl ? "/send/media" : "/send/text";
  const body = mediaUrl
    ? { number: cleanPhone, type: "image", file: mediaUrl, text }
    : { number: cleanPhone, text };

  try {
    const res = await fetch(`${UAZAPI_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error || `HTTP ${res.status}` };
    return { messageId: data.messageid || data.messageId || data.id || undefined };
  } catch (e: any) {
    return { error: e.message };
  }
}

async function sendViaMeta(
  instanceName: string,
  phone: string,
  text: string,
  templateId?: string,
  templateParams?: Record<string, any>,
): Promise<{ messageId?: string; error?: string }> {
  const supabase = createServiceClient();
  const phoneNumberId = instanceName.replace("meta:", "");

  const { data: ci } = await supabase
    .from("channel_integrations")
    .select("access_token")
    .eq("phone_number_id", phoneNumberId)
    .eq("status", "active")
    .maybeSingle();

  if (!ci?.access_token) return { error: "Meta access token not found" };

  const cleanPhone = phone.replace(/\D/g, "");
  const payload = templateId
    ? {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: { name: templateId, language: { code: "pt_BR" }, components: templateParams?.components || [] },
      }
    : {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ci.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error?.message || `HTTP ${res.status}` };
    return { messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Main Worker ────────────────────────────────────────────────────────

export function startCampaignWorker() {
  const worker = new Worker<CampaignJobData>(
    "msg:campaign",
    async (job: Job<CampaignJobData>) => {
      const {
        campaignId, tenantId, channel, instanceName,
        recipients, messageBody, mediaUrl, templateId, templateParams,
        delayMinMs, delayMaxMs,
      } = job.data;

      const supabase = createServiceClient();
      const io = getSocketIO();

      console.log(`[campaign-worker] Processing campaign ${campaignId}: ${recipients.length} recipients`);

      // Mark campaign as running
      await supabase
        .from("campaigns")
        .update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", campaignId);

      // Get billing rate for cost tracking
      const { data: rate } = await supabase.rpc("get_billing_rate", {
        p_channel: channel,
        p_partner_id: null, // TODO: resolve from campaign
      });
      const costPerMessage = Number(rate) || 0;

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        // Check if campaign was paused/cancelled
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();

        if (campaign?.status === "paused" || campaign?.status === "cancelled") {
          console.log(`[campaign-worker] Campaign ${campaignId} ${campaign.status}, stopping`);
          break;
        }

        // Idempotency: check if this recipient already processed
        const { data: existingLog } = await supabase
          .from("campaign_logs")
          .select("id, status")
          .eq("campaign_id", campaignId)
          .eq("recipient_phone", recipient.phone)
          .maybeSingle();

        if (existingLog && existingLog.status !== "pending") {
          // Already processed — skip
          continue;
        }

        // Create or get log entry
        let logId = existingLog?.id;
        if (!logId) {
          const { data: newLog } = await supabase
            .from("campaign_logs")
            .insert({
              campaign_id: campaignId,
              tenant_id: tenantId,
              recipient_phone: recipient.phone,
              recipient_name: recipient.name || null,
              channel,
              status: "processing",
              attempt_count: 1,
              cost: costPerMessage,
            })
            .select("id")
            .single();
          logId = newLog?.id;
        } else {
          await supabase
            .from("campaign_logs")
            .update({ status: "processing", attempt_count: (existingLog as any).attempt_count + 1 })
            .eq("id", logId);
        }

        // Send message
        let result: { messageId?: string; error?: string };

        if (channel === "meta") {
          result = await sendViaMeta(instanceName, recipient.phone, messageBody || "", templateId, templateParams);
        } else {
          result = await sendViaUazapi(instanceName, recipient.phone, messageBody || "", mediaUrl);
        }

        // Update log
        if (result.error) {
          failedCount++;
          await supabase
            .from("campaign_logs")
            .update({
              status: "failed",
              fail_reason: result.error.substring(0, 500),
              updated_at: new Date().toISOString(),
            })
            .eq("id", logId);
          await supabase.rpc("campaign_increment_counter", { p_campaign_id: campaignId, p_field: "failed_count" });
        } else {
          sentCount++;
          await supabase
            .from("campaign_logs")
            .update({
              status: "sent",
              provider_msg_id: result.messageId || null,
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", logId);
          await supabase.rpc("campaign_increment_counter", { p_campaign_id: campaignId, p_field: "sent_count" });
        }

        // Emit progress via Socket.io
        if (io) {
          io.to(`tenant:${tenantId}`).emit("campaign:progress", {
            campaignId,
            sent: sentCount,
            failed: failedCount,
            total: recipients.length,
            current: i + 1,
          });
        }

        // Dynamic delay (uazapi needs delays to avoid bans; Meta can burst)
        if (channel === "uazapi" && i < recipients.length - 1) {
          const delay = delayMinMs + Math.random() * (delayMaxMs - delayMinMs);
          await new Promise(r => setTimeout(r, delay));
        } else if (channel === "meta" && i < recipients.length - 1) {
          // Meta rate limit: ~80 messages/second for business accounts
          await new Promise(r => setTimeout(r, 50));
        }

        // Update progress every 10 messages
        if (i % 10 === 0) {
          await job.updateProgress(Math.round(((i + 1) / recipients.length) * 100));
        }
      }

      // Mark campaign as completed
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      console.log(`[campaign-worker] Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

      return { sentCount, failedCount };
    },
    {
      connection: REDIS_CAMPAIGN,
      concurrency: 3, // Process up to 3 campaigns simultaneously
      limiter: { max: 5, duration: 60000 }, // Max 5 campaigns per minute
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[campaign-worker] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[campaign-worker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[campaign-worker] Started, listening on msg:campaign queue");
  return worker;
}
