import type { Message } from "@/data/mockMessages";
import type { ChannelType } from "@/components/ui/ChannelIcon";

/* ── pure helpers (no React, no Supabase) ─────────── */

export function isGroupJid(jid: string) {
  return jid?.endsWith("@g.us") ?? false;
}

export function jidToPhone(jid: string) {
  return jid?.replace(/@.*$/, "") ?? "";
}

export function phoneInitials(phone: string) {
  const clean = phone.replace(/\D/g, "");
  return clean.slice(-2).toUpperCase() || "??";
}

export function groupInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "GP";
}

const palette = ["#00A884", "#7C3AED", "#F59E0B", "#EF4444", "#0EA5E9", "#EC4899"];
export function colorFromJid(jid: string) {
  let h = 0;
  for (let i = 0; i < jid.length; i++) h = (h * 31 + jid.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export function statusNumToLabel(n: number): Message["status"] {
  if (n >= 3) return "read";
  if (n === 2) return "delivered";
  if (n === 1) return "sent";
  return "pending";
}

export function mapMessageType(t: string, mediaUrl?: string | null, caption?: string | null): Message["type"] {
  const lower = (t || "").toLowerCase();
  if (lower.includes("image")) return "image";
  if (lower.includes("video") || lower === "ptv") return "video";
  if (lower.includes("audio") || lower === "ptt") return "audio";
  if (lower.includes("document")) return "document";
  // Generic "media" — detect by file extension
  if (lower === "media") {
    const url = (mediaUrl || caption || "").toLowerCase();
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|csv|txt)(\?|$)/i.test(url)) return "document";
    if (/\.(mp4|mov|avi|webm)(\?|$)/i.test(url)) return "video";
    if (/\.(mp3|ogg|opus|m4a|wav)(\?|$)/i.test(url)) return "audio";
    return "image";
  }
  return "text";
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export const WHATSAPP_CDN_REGEX = /(?:^https?:\/\/)?(?:mmg\.whatsapp\.net|[^/]*\.cdn\.whatsapp\.net)/i;

export function isMediaType(type: Message["type"]) {
  return type === "image" || type === "video" || type === "audio" || type === "document";
}

export function extractDownloadUrl(payload: any): string | null {
  return (
    payload?.fileURL ??
    payload?.fileUrl ??
    payload?.url ??
    payload?.data?.fileURL ??
    payload?.data?.fileUrl ??
    payload?.data?.url ??
    null
  );
}

export function detectChannel(instanceName: string): ChannelType {
  if (instanceName?.startsWith("meta:")) return "whatsapp_meta";
  if (instanceName?.startsWith("messenger:") || instanceName?.startsWith("messenger_")) return "facebook";
  if (instanceName?.startsWith("instagram:") || instanceName?.startsWith("instagram_")) return "instagram";
  if (instanceName?.startsWith("telegram_")) return "telegram";
  if (instanceName?.startsWith("webchat_")) return "webchat";
  if (instanceName?.startsWith("mercadolivre_")) return "mercadolivre";
  return "whatsapp_web";
}
