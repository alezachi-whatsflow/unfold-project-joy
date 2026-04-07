/**
 * meta-proxy — Unified Meta Cloud API proxy for WhatsApp messages.
 *
 * Sends text, image, document, audio, video via Graph API v21.0.
 * Uses channel_integrations table (NOT deprecated meta_connections).
 * Saves outgoing snapshot to whatsapp_messages for consistent inbox display.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, message, media_url, media_type, phone_number_id, template, context_message_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get the active Meta connection from channel_integrations (primary)
    //    Falls back to meta_connections (deprecated) if not found
    let accessToken: string | null = null;
    let pnId = phone_number_id;

    if (pnId) {
      // Try channel_integrations first
      const { data: ci } = await supabase
        .from("channel_integrations")
        .select("access_token, phone_number_id")
        .eq("phone_number_id", pnId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (ci?.access_token) {
        accessToken = ci.access_token;
      }
    }

    // Fallback: try channel_integrations without phone_number_id filter
    if (!accessToken) {
      const { data: ci } = await supabase
        .from("channel_integrations")
        .select("access_token, phone_number_id")
        .eq("status", "active")
        .in("provider", ["WABA", "meta_whatsapp"])
        .limit(1)
        .maybeSingle();

      if (ci?.access_token) {
        accessToken = ci.access_token;
        pnId = ci.phone_number_id;
      }
    }

    // Last resort fallback: deprecated meta_connections
    if (!accessToken) {
      const { data: legacy } = await supabase
        .from("meta_connections")
        .select("access_token, phone_number_id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (legacy?.access_token) {
        accessToken = legacy.access_token;
        pnId = legacy.phone_number_id;
        console.warn("[meta-proxy] Using deprecated meta_connections table. Migrate to channel_integrations.");
      }
    }

    if (!accessToken || !pnId) {
      return new Response(
        JSON.stringify({ ok: false, error: "No active Meta connection found. Configure in Integracoes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // 2. Build message payload based on action
    let messagePayload: any;

    switch (action) {
      case "send-text":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
          ...(context_message_id ? { context: { message_id: context_message_id } } : {}),
        };
        break;

      case "send-template":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: template || { name: "hello_world", language: { code: "pt_BR" } },
        };
        break;

      case "send-image":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "image",
          image: { link: media_url, caption: message || undefined },
        };
        break;

      case "send-document":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "document",
          document: { link: media_url, caption: message || undefined },
        };
        break;

      case "send-audio":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "audio",
          audio: { link: media_url },
        };
        break;

      case "send-video":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "video",
          video: { link: media_url, caption: message || undefined },
        };
        break;

      default:
        return new Response(
          JSON.stringify({ ok: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // 3. Send via Meta Graph API
    const response = await fetch(`${GRAPH_API}/${pnId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[meta-proxy] Meta API error:", result);
      return new Response(
        JSON.stringify({ ok: false, error: result.error?.message || "Meta API error" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Save outgoing snapshot to whatsapp_messages (same table as uazapi-proxy)
    const waMessageId = result.messages?.[0]?.id;
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    if (waMessageId) {
      const msgType = action === "send-text" ? "text"
        : action === "send-template" ? "template"
        : (media_type || action.replace("send-", ""));

      await supabase.from("whatsapp_messages").upsert({
        message_id: waMessageId,
        instance_name: `meta:${pnId}`,
        remote_jid: remoteJid,
        direction: "outgoing",
        type: msgType,
        body: message || "",
        media_url: media_url || null,
        caption: action !== "send-text" ? (message || null) : null,
        status: 1, // SERVER_ACK
        track_source: "meta_cloud_api",
        raw_payload: result,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "message_id" });
    }

    console.log(`[meta-proxy] Sent ${action} to ${cleanPhone} via ${pnId}: ${waMessageId}`);

    return new Response(
      JSON.stringify({ ok: true, success: true, data: result, message_id: waMessageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[meta-proxy] error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
