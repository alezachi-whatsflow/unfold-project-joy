/**
 * uazapi API calls via Supabase Edge Function proxy.
 * All calls go through uazapi-proxy — no direct browser-to-uazapi fetch.
 */
import { supabase } from "@/integrations/supabase/client";

export async function callUazapi(
  instanceName: string,
  path: string,
  method: string = "POST",
  body?: Record<string, any>,
): Promise<any> {
  if (body?.replyid) {
    console.log(`[uazapi] REPLY SEND → number: ${body.number}, replyid: ${body.replyid}, text: ${body.text?.substring(0, 50)}`);
  }

  const resp = await supabase.functions.invoke("uazapi-proxy", {
    body: { path, method, body, instanceName },
  });

  if (resp.error) {
    console.error(`[uazapi] proxy error:`, resp.error);
    throw new Error(resp.error.message || `uazapi proxy error`);
  }

  const envelope = resp.data;
  const data = envelope?.data ?? envelope;

  if (envelope && typeof envelope.ok !== "undefined" && !envelope.ok) {
    console.error(`[uazapi] ${method} ${path} upstream ${envelope.upstream_status}:`, data);
    throw new Error(data?.error || data?.message || `uazapi error ${envelope.upstream_status}`);
  }

  // Auto-save outgoing message to DB
  if (path.startsWith("/send/") && data) {
    try {
      await saveOutgoingMessage(instanceName, body, data, path);
    } catch (e) {
      console.warn("[uazapi] Failed to save outgoing message:", e);
    }
  }

  return { ok: true, data };
}

async function saveOutgoingMessage(
  instanceName: string,
  requestBody: any,
  responseData: any,
  path: string,
) {
  const rd = responseData?.data ?? responseData;
  const messageId = normalizeMessageId(
    rd?.messageid ?? rd?.messageId ?? rd?.id ?? rd?.key?.id ?? null
  );

  if (!messageId) {
    console.warn("[uazapi] No message_id in response, skipping save");
    return;
  }

  const remoteJid = requestBody?.number
    ? requestBody.number.includes("@")
      ? requestBody.number
      : `${requestBody.number}@s.whatsapp.net`
    : null;

  if (!remoteJid) return;

  // Detect type
  let type = "text";
  if (path.includes("/media")) {
    const fileUrl = (requestBody?.file || requestBody?.url || "").toLowerCase();
    const mediaType = (requestBody?.type || "").toLowerCase();
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|csv|txt)(\?|$)/.test(fileUrl) || mediaType === "document") {
      type = "document";
    } else if (/\.(mp4|mov|avi|webm)(\?|$)/.test(fileUrl) || mediaType === "video") {
      type = "video";
    } else if (/\.(mp3|ogg|opus|m4a|wav)(\?|$)/.test(fileUrl) || mediaType === "audio") {
      type = "audio";
    } else {
      type = "image";
    }
  } else if (path.includes("/location")) {
    type = "location";
  } else if (path.includes("/contact")) {
    type = "contact";
  }

  const { getTenantId } = await import("@/lib/tenantResolver");
  let tenantId: string | undefined;
  try { tenantId = await getTenantId(); } catch { /* ignore */ }

  const fileUrl = requestBody?.file || requestBody?.url || null;

  // Extract quoted_message_id from request (replyid) or response (quoted)
  const quotedMessageId = requestBody?.replyid || rd?.quoted || null;

  const insertData: Record<string, any> = {
    instance_name: instanceName,
    remote_jid: remoteJid,
    message_id: messageId,
    direction: "outgoing",
    type,
    body: requestBody?.text || requestBody?.message || null,
    media_url: fileUrl,
    caption: requestBody?.text || (type !== "text" ? (fileUrl?.split("/").pop()?.split("?")[0] || null) : null),
    status: 2,
    tenant_id: tenantId || null,
    raw_payload: rd,
  };

  // Save quoted_message_id if this is a reply
  if (quotedMessageId) {
    insertData.quoted_message_id = quotedMessageId;
    console.log(`[uazapi] REPLY SAVED → msg: ${messageId}, quoted: ${quotedMessageId}`);
  }

  console.log(`[uazapi] SAVE → msg: ${messageId}, jid: ${remoteJid}, type: ${type}${quotedMessageId ? `, reply_to: ${quotedMessageId}` : ""}`);

  await (supabase as any).from("whatsapp_messages").insert(insertData).then(({ error }: any) => {
    if (error && !error.message?.includes("duplicate")) {
      console.warn("[uazapi] Save outgoing error:", error.message);
    }
  });
}

function normalizeMessageId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const withoutJidPrefix = raw.replace(/^\d+:/, "").replace(/^(true|false)_/i, "");
  const parts = withoutJidPrefix.split("_");
  const tail = parts[parts.length - 1];
  if (parts.length > 1 && /^[A-Za-z0-9]{10,}$/.test(tail)) return tail;
  return withoutJidPrefix;
}
