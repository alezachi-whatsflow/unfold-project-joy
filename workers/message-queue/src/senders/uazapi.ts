import { config } from "../config.js";
import { logger } from "../logger.js";
import type { MessageJob, SendResult } from "../types.js";

// ═══════════════════════════════════════════
// uazapi Message Sender
// ═══════════════════════════════════════════

const BASE = config.uazapi.baseUrl;

export async function sendViaUazapi(job: MessageJob): Promise<SendResult> {
  const token = job.instanceToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    token,
  };

  let endpoint: string;
  let body: Record<string, unknown>;

  switch (job.type) {
    case "text":
      endpoint = "/send/text";
      body = {
        number: job.number,
        text: job.text,
        linkPreview: job.linkPreview ?? false,
      };
      break;

    case "image":
    case "video":
    case "audio":
    case "document":
    case "ptt":
      endpoint = "/send/media";
      body = {
        number: job.number,
        type: job.type,
        file: job.file,
        text: job.text,
        docName: job.docName,
      };
      break;

    case "button":
    case "list":
    case "poll":
      endpoint = "/send/menu";
      body = {
        number: job.number,
        type: job.type,
        text: job.text,
        choices: job.choices,
        footerText: job.footerText,
        listButton: job.listButton,
      };
      break;

    case "contact":
      endpoint = "/send/contact";
      body = {
        number: job.number,
        fullName: job.fullName,
        phoneNumber: job.phoneNumber,
        organization: job.organization,
      };
      break;

    default:
      return { success: false, error: `Unknown message type`, provider: "uazapi" };
  }

  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error || `HTTP ${res.status}`;
      logger.warn({ endpoint, number: job.number, error: errorMsg }, "uazapi send failed");
      return {
        success: false,
        error: errorMsg,
        errorCode: String(res.status),
        provider: "uazapi",
      };
    }

    return {
      success: true,
      messageId: data?.messageid || data?.id,
      provider: "uazapi",
    };
  } catch (err: any) {
    logger.error({ err, endpoint, number: job.number }, "uazapi send exception");
    return {
      success: false,
      error: err.message,
      provider: "uazapi",
    };
  }
}
