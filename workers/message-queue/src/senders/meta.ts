import { logger } from "../logger.js";
import type { MessageJob, SendResult } from "../types.js";

// ═══════════════════════════════════════════
// Meta Cloud API Message Sender (WhatsApp)
// ═══════════════════════════════════════════

const GRAPH_URL = "https://graph.facebook.com/v21.0";

export async function sendViaMeta(job: MessageJob, phoneNumberId: string, accessToken: string): Promise<SendResult> {
  const endpoint = `${GRAPH_URL}/${phoneNumberId}/messages`;

  let payload: Record<string, unknown>;

  switch (job.type) {
    case "text":
      payload = {
        messaging_product: "whatsapp",
        to: job.number,
        type: "text",
        text: { body: job.text },
      };
      break;

    case "image":
      payload = {
        messaging_product: "whatsapp",
        to: job.number,
        type: "image",
        image: { link: job.file, caption: job.text },
      };
      break;

    case "video":
      payload = {
        messaging_product: "whatsapp",
        to: job.number,
        type: "video",
        video: { link: job.file, caption: job.text },
      };
      break;

    case "document":
      payload = {
        messaging_product: "whatsapp",
        to: job.number,
        type: "document",
        document: { link: job.file, caption: job.text, filename: job.docName },
      };
      break;

    case "audio":
    case "ptt":
      payload = {
        messaging_product: "whatsapp",
        to: job.number,
        type: "audio",
        audio: { link: job.file },
      };
      break;

    default:
      return { success: false, error: `Meta doesn't support type: ${job.type}`, provider: "meta" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `HTTP ${res.status}`;
      const errorCode = String(data?.error?.code || res.status);
      logger.warn({ number: job.number, error: errorMsg, code: errorCode }, "Meta send failed");
      return { success: false, error: errorMsg, errorCode, provider: "meta" };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
      provider: "meta",
    };
  } catch (err: any) {
    logger.error({ err, number: job.number }, "Meta send exception");
    return { success: false, error: err.message, provider: "meta" };
  }
}
