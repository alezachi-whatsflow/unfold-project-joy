/**
 * telegramClient.ts
 * Manages GramJS client instances per tenant.
 * Handles QR login, session persistence, message relay.
 */
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { config } from "./config";
import { getSupabase } from "./supabase";

// ── Active clients per integration ID ──
const clients = new Map<
  string,
  {
    client: TelegramClient;
    tenantId: string;
    sessionId: string;
    connected: boolean;
  }
>();

// ── Relay incoming message to our Edge Function webhook ──
async function relayToWebhook(
  integrationId: string,
  tenantId: string,
  sessionId: string,
  event: NewMessageEvent,
) {
  const msg = event.message;
  const chat = await msg.getChat();
  const sender = await msg.getSender();

  const isGroup =
    chat?.className === "Chat" ||
    chat?.className === "Channel" ||
    chat?.className === "ChatForbidden";

  const senderName =
    (sender as any)?.firstName && (sender as any)?.lastName
      ? `${(sender as any).firstName} ${(sender as any).lastName}`
      : (sender as any)?.firstName ||
        (sender as any)?.username ||
        String((sender as any)?.id || "unknown");

  const payload = {
    session_id: sessionId,
    event: "message",
    message: {
      id: msg.id,
      text: msg.text || "",
      from: {
        id: (sender as any)?.id?.valueOf?.() || 0,
        first_name: (sender as any)?.firstName || "",
        last_name: (sender as any)?.lastName || "",
        username: (sender as any)?.username || "",
      },
      chat_id:
        chat?.id?.valueOf?.() ||
        (msg.peerId as any)?.channelId?.valueOf?.() ||
        (msg.peerId as any)?.chatId?.valueOf?.() ||
        (msg.peerId as any)?.userId?.valueOf?.() ||
        0,
      chat_title: (chat as any)?.title || "",
      timestamp: msg.date,
      is_group: isGroup,
      type: detectMessageType(msg),
      media_url: null, // TODO: download media and upload to R2
      caption: msg.text && msg.media ? msg.text : undefined,
      reply_to_msg_id: msg.replyTo?.replyToMsgId || undefined,
    },
  };

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": config.webhookSecret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(
        `[telegram] Webhook relay failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.error("[telegram] Webhook relay error:", (err as Error).message);
  }
}

function detectMessageType(msg: Api.Message): string {
  if (msg.photo) return "image";
  if (msg.video || msg.videoNote) return "video";
  if (msg.voice || msg.audio) return "audio";
  if (msg.document) return "document";
  if (msg.sticker) return "sticker";
  if (msg.geo) return "location";
  if (msg.contact) return "contact";
  return "text";
}

// ── Start / restore a client for an integration ──
export async function startClient(
  integrationId: string,
  tenantId: string,
  sessionId: string,
  savedSession?: string,
): Promise<TelegramClient> {
  // If already running, return existing
  const existing = clients.get(integrationId);
  if (existing?.connected && existing.client.connected) {
    return existing.client;
  }

  const session = new StringSession(savedSession || "");
  const client = new TelegramClient(session, config.telegramApiId, config.telegramApiHash, {
    connectionRetries: config.maxReconnectAttempts,
    autoReconnect: true,
    retryDelay: config.reconnectDelayMs,
  });

  // Event: new messages → relay
  client.addEventHandler(
    (event: NewMessageEvent) => {
      // Skip outgoing messages from ourselves
      if (event.message.out) return;
      relayToWebhook(integrationId, tenantId, sessionId, event).catch(
        (err) => console.error("[telegram] Relay error:", err.message),
      );
    },
    new NewMessage({}),
  );

  clients.set(integrationId, {
    client,
    tenantId,
    sessionId,
    connected: false,
  });

  // If we have a saved session, connect silently
  if (savedSession) {
    try {
      await client.connect();
      const entry = clients.get(integrationId);
      if (entry) entry.connected = true;
      console.log(`[telegram] Client ${sessionId} connected from saved session`);

      // Notify webhook of connection
      await notifyConnection(sessionId, true);
    } catch (err) {
      console.error(`[telegram] Failed to connect ${sessionId}:`, (err as Error).message);
    }
  }

  return client;
}

// ── Generate QR Code for login ──
export async function generateQrLogin(
  integrationId: string,
  tenantId: string,
  sessionId: string,
): Promise<{ qrUrl: string; promise: Promise<void> }> {
  const client = await startClient(integrationId, tenantId, sessionId);

  let resolveLogin: () => void;
  let rejectLogin: (err: Error) => void;
  const loginPromise = new Promise<void>((resolve, reject) => {
    resolveLogin = resolve;
    rejectLogin = reject;
  });

  let currentQrUrl = "";

  // Start QR login flow (non-blocking)
  (async () => {
    try {
      const user = await client.signInUserWithQrCode(
        { apiId: config.telegramApiId, apiHash: config.telegramApiHash },
        {
          qrCode: async (code) => {
            // GramJS provides the token bytes — convert to tg://login URL
            const tokenBase64 = Buffer.from(code.token).toString("base64url");
            currentQrUrl = `tg://login?token=${tokenBase64}`;
            console.log(`[telegram] QR code generated for ${sessionId}`);
          },
          onError: async (err) => {
            console.error(`[telegram] QR login error for ${sessionId}:`, err.message);
            return true; // true = retry
          },
          password: async () => {
            // 2FA not supported via QR flow — reject
            rejectLogin!(new Error("2FA_REQUIRED"));
            return "";
          },
        },
      );

      // Login successful — save session
      const savedSession = client.session.save() as unknown as string;
      const entry = clients.get(integrationId);
      if (entry) entry.connected = true;

      console.log(`[telegram] Login successful for ${sessionId}: ${(user as any)?.firstName || "?"}`);

      // Persist session to Supabase
      const supabase = getSupabase();
      await supabase
        .from("channel_integrations")
        .update({
          credentials: { string_session: savedSession },
          status: "active",
          name: `Telegram ${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integrationId);

      await notifyConnection(sessionId, true);
      resolveLogin!();
    } catch (err) {
      console.error(`[telegram] Login failed for ${sessionId}:`, (err as Error).message);
      rejectLogin!(err as Error);
    }
  })();

  // Wait a moment for the first QR to be generated
  await new Promise((r) => setTimeout(r, 2000));

  return {
    qrUrl: currentQrUrl,
    promise: loginPromise,
  };
}

// ── Send a message from our platform ──
export async function sendMessage(
  integrationId: string,
  chatId: number | string,
  text: string,
  replyToMsgId?: number,
): Promise<{ messageId: number }> {
  const entry = clients.get(integrationId);
  if (!entry || !entry.connected || !entry.client.connected) {
    throw new Error("Client not connected");
  }

  const result = await entry.client.sendMessage(chatId, {
    message: text,
    replyTo: replyToMsgId,
  });

  return { messageId: result.id };
}

// ── Get client status ──
export function getClientStatus(integrationId: string) {
  const entry = clients.get(integrationId);
  if (!entry) return { connected: false, exists: false };
  return {
    connected: entry.connected && entry.client.connected,
    exists: true,
    sessionId: entry.sessionId,
    tenantId: entry.tenantId,
  };
}

// ── Disconnect a client ──
export async function disconnectClient(integrationId: string) {
  const entry = clients.get(integrationId);
  if (!entry) return;

  try {
    await entry.client.disconnect();
  } catch (_) {}

  await notifyConnection(entry.sessionId, false);
  clients.delete(integrationId);
}

// ── Restore all active sessions on startup ──
export async function restoreAllSessions() {
  const supabase = getSupabase();
  const { data: integrations, error } = await supabase
    .from("channel_integrations")
    .select("id, tenant_id, channel_id, credentials, status")
    .eq("provider", "TELEGRAM")
    .eq("status", "active");

  if (error) {
    console.error("[telegram] Failed to load integrations:", error.message);
    return;
  }

  console.log(`[telegram] Restoring ${integrations?.length || 0} active sessions...`);

  for (const int of integrations || []) {
    const savedSession = (int.credentials as any)?.string_session;
    if (!savedSession) continue;

    const sessionId = int.channel_id || int.id;
    try {
      await startClient(int.id, int.tenant_id, sessionId, savedSession);
    } catch (err) {
      console.error(`[telegram] Failed to restore ${sessionId}:`, (err as Error).message);
    }
  }
}

// ── Notify webhook of connection status ──
async function notifyConnection(sessionId: string, connected: boolean) {
  try {
    await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": config.webhookSecret,
      },
      body: JSON.stringify({
        session_id: sessionId,
        event: "connection",
        status: { connected },
      }),
    });
  } catch (_) {}
}

// ── List all active clients ──
export function listClients() {
  const result: Array<{
    integrationId: string;
    sessionId: string;
    tenantId: string;
    connected: boolean;
  }> = [];
  for (const [id, entry] of clients) {
    result.push({
      integrationId: id,
      sessionId: entry.sessionId,
      tenantId: entry.tenantId,
      connected: entry.connected && entry.client.connected,
    });
  }
  return result;
}
