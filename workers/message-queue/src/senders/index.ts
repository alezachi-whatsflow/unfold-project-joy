import { sendViaUazapi } from "./uazapi.js";
import { sendViaMeta } from "./meta.js";
import { supabase } from "../connections.js";
import { logger } from "../logger.js";
import type { MessageJob, SendResult } from "../types.js";

// ═══════════════════════════════════════════
// Unified Message Sender
// Routes to uazapi or Meta based on job.provider
// ═══════════════════════════════════════════

export async function sendMessage(job: MessageJob): Promise<SendResult> {
  if (job.provider === "uazapi") {
    return sendViaUazapi(job);
  }

  if (job.provider === "meta") {
    // Lookup Meta credentials for this tenant
    const { data: channel } = await supabase
      .from("channel_integrations")
      .select("config")
      .eq("tenant_id", job.tenantId)
      .eq("provider", "meta_whatsapp")
      .eq("is_active", true)
      .maybeSingle();

    if (!channel?.config) {
      return { success: false, error: "No Meta channel configured for tenant", provider: "meta" };
    }

    const { phone_number_id, access_token } = channel.config as any;
    if (!phone_number_id || !access_token) {
      return { success: false, error: "Meta channel missing phone_number_id or access_token", provider: "meta" };
    }

    return sendViaMeta(job, phone_number_id, access_token);
  }

  return { success: false, error: `Unknown provider: ${job.provider}`, provider: job.provider };
}

// ── Save message to DB after send ─────────────────────────

export async function saveMessageToDb(job: MessageJob, result: SendResult): Promise<void> {
  try {
    const body = job.type === "text" ? job.text
      : job.type === "contact" ? `[Contato] ${job.fullName}`
      : job.text || `[${job.type}]`;

    await supabase.from("whatsapp_messages").insert({
      message_id: result.messageId || crypto.randomUUID(),
      instance_name: job.instanceToken,
      remote_jid: `${job.number}@s.whatsapp.net`,
      direction: "outgoing",
      body,
      status: result.success ? 2 : 0, // 2=delivered, 0=error
      sender_name: "API",
      message_type: job.type === "text" ? "conversation" : job.type,
      tenant_id: job.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err, messageId: result.messageId }, "Failed to save message to DB");
  }
}
