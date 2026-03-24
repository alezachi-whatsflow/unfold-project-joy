import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL")!;
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Endpoints que requerem admintoken (header: admintoken)
const ADMIN_ENDPOINTS = [
  "/instance/init",
  "/instance/all",
  "/instance/updateAdminFields",
  "/globalwebhook",
  "/admin/restart",
];

const isAdminEndpoint = (path: string) =>
  ADMIN_ENDPOINTS.some((ep) => path === ep || path.startsWith(ep));

const normalizeMessageId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const withoutJidPrefix = raw.replace(/^\d+:/, "").replace(/^(true|false)_/i, "");
  const parts = withoutJidPrefix.split("_");
  const tail = parts[parts.length - 1];

  if (parts.length > 1 && /^[A-Za-z0-9]{10,}$/.test(tail)) {
    return tail;
  }

  return withoutJidPrefix;
};

const toMessageStatus = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;

  const normalizedKey = String(value).trim().toUpperCase();
  const mapped: Record<string, number> = {
    ERROR: 0,
    PENDING: 0,
    SERVER_ACK: 1,
    SENT: 1,
    DELIVERY_ACK: 2,
    DELIVERED: 2,
    READ: 3,
    PLAYED: 3,
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 3,
    "5": 3,
  };

  if (normalizedKey in mapped) return mapped[normalizedKey];

  const numericStatus = Number(value);
  if (!Number.isNaN(numericStatus)) {
    if (numericStatus <= 0) return 0;
    if (numericStatus === 1) return 1;
    if (numericStatus === 2) return 2;
    return 3;
  }

  return undefined;
};

const isSafeMediaUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  if (!value || value.length > 2048) return false;
  return /^https?:\/\//i.test(value);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do usuário Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { path, method = "GET", body, instanceName } = await req.json();

    if (!path || typeof path !== "string") {
      return json({ error: "path is required and must be a string" }, 400);
    }

    // Validação de segurança: bloquear path traversal e caracteres perigosos
    if (path.includes("..") || path.includes("//") || /[<>"'`;|&]/.test(path)) {
      return json({ error: "Invalid path" }, 400);
    }

    // Whitelist de prefixos permitidos
    const ALLOWED_PREFIXES = [
      "/instance", "/send/", "/webhook", "/group", "/chat",
      "/contact", "/queue", "/message", "/admin", "/globalwebhook",
      "/status", "/profile", "/qrcode", "/paircode",
    ];
    if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p) || path === p.replace(/\/$/, ""))) {
      return json({ error: "Path not allowed" }, 403);
    }

    if (path === "/send/media") {
      if (!isSafeMediaUrl(body?.file)) {
        return json({ error: "Invalid media file URL" }, 400);
      }
      if (typeof body?.text === "string" && body.text.length > 1000) {
        return json({ error: "Caption too long" }, 400);
      }
    }

    // Selecionar o token correto e o header correto
    let authTokenHeader: Record<string, string> = {};

    if (isAdminEndpoint(path)) {
      // Endpoints admin: header admintoken
      authTokenHeader = { admintoken: UAZAPI_ADMIN_TOKEN };
    } else {
      // Endpoints de instância: header token
      if (!instanceName) {
        return json({ error: "instanceName required for instance endpoints" }, 400);
      }
      // Buscar token da instância no banco
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_token")
        .eq("instance_name", instanceName)
        .single();

      if (!inst?.instance_token) {
        return json({ error: `Instance token not found for: ${instanceName}` }, 404);
      }
      authTokenHeader = { token: inst.instance_token };
    }

    // Fazer chamada para a uazapi
    const uazapiUrl = `${UAZAPI_BASE_URL}${path}`;
    console.log(`uazapi-proxy: ${method} ${uazapiUrl}`);

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...authTokenHeader,
      },
    };

    if (body && method.toUpperCase() !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const uazapiResponse = await fetch(uazapiUrl, fetchOptions);
    const responseText = await uazapiResponse.text();

    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`uazapi-proxy response: ${uazapiResponse.status}`, JSON.stringify(responseData).substring(0, 500));

    // Se foi criação de instância, salvar no banco automaticamente
    if (path === "/instance/init" && uazapiResponse.ok && responseData) {
      const rd = responseData as Record<string, any>;
      const inst = rd.instance || {};
      const instanceToken = rd.token; // Token SEMPRE na raiz

      if (instanceToken) {
        const instanceData = {
          instance_name: rd.name || body?.name,
          instance_token: instanceToken,
          status: inst.status || "disconnected",
          qr_code: inst.qrcode || null,
          pair_code: inst.paircode || null,
          profile_name: inst.profileName || null,
          profile_pic_url: inst.profilePicUrl || null,
          is_business: inst.isBusiness || false,
          platform: inst.plataform || null,
          system_name: inst.systemName || "uazapiGO",
          owner_email: inst.owner || null,
          current_presence: inst.currentPresence || "available",
          chatbot_enabled: inst.chatbot_enabled || false,
          chatbot_ignore_groups: inst.chatbot_ignoreGroups ?? true,
          chatbot_stop_keyword: inst.chatbot_stopConversation || "parar",
          chatbot_stop_minutes: inst.chatbot_stopMinutes || 60,
          openai_apikey: inst.openai_apikey || null,
          api_created_at: inst.created || null,
          api_updated_at: inst.updated || null,
          // Campos legados para compatibilidade
          label: rd.name || body?.name,
          session_id: rd.name || body?.name,
          provedor: "uazapi",
          token_api: instanceToken,
          server_url: UAZAPI_BASE_URL,
          admin_token: UAZAPI_ADMIN_TOKEN,
        };

        console.log("uazapi-proxy: Saving instance to DB:", JSON.stringify(instanceData).substring(0, 300));

        const { error: upsertErr } = await supabase
          .from("whatsapp_instances")
          .upsert(instanceData, { onConflict: "session_id" });

        if (upsertErr) {
          console.error("uazapi-proxy: Failed to save instance:", upsertErr);
        }
      }
    }

    // Se foi configuração de webhook, salvar a URL
    if (path === "/webhook" && method.toUpperCase() === "POST" && uazapiResponse.ok && instanceName) {
      const webhookUrl = body?.url || body?.webhookUrl || "";
      if (webhookUrl) {
        await supabase
          .from("whatsapp_instances")
          .update({ webhook_url: webhookUrl })
          .eq("instance_name", instanceName);
      }
    }

    // Se foi envio de mensagem, persistir snapshot para refletir instantaneamente no painel
    if (path.startsWith("/send/") && uazapiResponse.ok && instanceName) {
      const rd = responseData as Record<string, any>;
      const messageTimestamp = Number(rd?.messageTimestamp ?? Date.now());
      const messageIso = new Date(
        messageTimestamp > 1_000_000_000_000 ? messageTimestamp : messageTimestamp * 1000
      ).toISOString();

      const remoteJid =
        rd?.chatid ||
        (typeof body?.number === "string" && body.number.includes("@")
          ? body.number
          : `${body?.number}@s.whatsapp.net`);

      const providerMessageId = normalizeMessageId(
        rd?.messageid ?? rd?.messageId ?? rd?.id ?? rd?.key?.id ?? null
      );
      const fallbackTypeFromPath =
        path === "/send/text"
          ? "text"
          : path === "/send/location"
          ? "location"
          : path === "/send/contact"
          ? "contact"
          : path === "/send/menu"
          ? "menu"
          : path === "/send/media"
          ? String(body?.type || "media")
          : "unknown";
      const messageType = String(rd?.messageType || fallbackTypeFromPath);
      const messageBody = rd?.text || rd?.content?.text || body?.text || body?.name || null;
      const mediaUrl =
        path === "/send/media"
          ? body?.file || rd?.fileURL || rd?.fileUrl || null
          : rd?.fileURL || rd?.fileUrl || null;
      const caption = typeof body?.text === "string" ? body.text : null;
      // When API returns success, message is at least "sent" (2 = delivered is safe default for outgoing)
      const rawStatus = toMessageStatus(rd?.status ?? rd?.ack ?? rd?.chatMessageStatusCode ?? null);
      const snapshotStatus = rawStatus !== undefined && rawStatus >= 2 ? rawStatus : 2;

      if (remoteJid && providerMessageId) {
        await supabase.from("whatsapp_messages").upsert(
          {
            instance_name: instanceName,
            remote_jid: remoteJid,
            message_id: providerMessageId,
            direction: "outgoing",
            type: messageType,
            body: messageBody,
            media_url: mediaUrl,
            caption,
            status: snapshotStatus,
            raw_payload: rd,
            created_at: messageIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "message_id" }
        );
      } else {
        console.warn("uazapi-proxy: skipped snapshot persistence due to missing canonical message id");
      }
    }

    // Always return 200 to avoid supabase.functions.invoke treating non-2xx as errors
    return json({ data: responseData, upstream_status: uazapiResponse.status, ok: uazapiResponse.ok });
  } catch (err) {
    console.error("uazapi-proxy error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
