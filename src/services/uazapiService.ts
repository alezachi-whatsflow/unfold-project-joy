/**
 * Direct uazapi API calls from frontend.
 * Fetches instance token from DB, calls uazapi API directly.
 * Replaces dependency on uazapi-proxy Edge Function.
 */
import { supabase } from "@/integrations/supabase/client";

const UAZAPI_BASE_URL = "https://whatsflow.uazapi.com";

interface InstanceInfo {
  instance_name: string;
  instance_token: string;
  server_url: string | null;
}

let _instanceCache: Record<string, { info: InstanceInfo; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getInstanceInfo(instanceName: string): Promise<InstanceInfo> {
  const cached = _instanceCache[instanceName];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.info;

  const { data, error } = await (supabase as any)
    .from("whatsapp_instances")
    .select("instance_name, instance_token, server_url")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (error || !data?.instance_token) {
    throw new Error(`Instancia "${instanceName}" nao encontrada ou sem token.`);
  }

  const info: InstanceInfo = {
    instance_name: data.instance_name,
    instance_token: data.instance_token,
    server_url: data.server_url,
  };

  _instanceCache[instanceName] = { info, ts: Date.now() };
  return info;
}

export async function callUazapi(
  instanceName: string,
  path: string,
  method: string = "POST",
  body?: Record<string, any>,
): Promise<any> {
  const inst = await getInstanceInfo(instanceName);
  const baseUrl = inst.server_url || UAZAPI_BASE_URL;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    token: inst.instance_token,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify(body || {}) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[uazapi] ${method} ${path} failed:`, res.status, data);
    throw new Error(data?.error || data?.message || `uazapi error ${res.status}`);
  }

  // Auto-save outgoing message to DB if it's a send action
  if (path.startsWith("/send/") && data) {
    try {
      await saveOutgoingMessage(inst.instance_name, body, data, path);
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

  if (!messageId) return;

  const remoteJid = requestBody?.number
    ? requestBody.number.includes("@")
      ? requestBody.number
      : `${requestBody.number}@s.whatsapp.net`
    : null;

  if (!remoteJid) return;

  // Detect actual type from file URL/name instead of generic "media"
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

  await (supabase as any).from("whatsapp_messages").insert({
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
  }).then(({ error }: any) => {
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
