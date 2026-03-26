import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// MESSENGER SEND — Send messages via Facebook Messenger API
//
// Body:
//   { page_id, recipient_psid, text?, attachment? }
//   OR
//   { integration_id, recipient_psid, text?, attachment? }
//
// Uses Graph API v21.0: POST /{page_id}/messages
// Auth: page_access_token from channel_integrations
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Auth check
    const { data: { user }, error: authErr } = await adminClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { page_id, integration_id, recipient_psid, text, attachment } = await req.json();

    if (!recipient_psid) return json({ error: "recipient_psid is required" }, 400);
    if (!text && !attachment) return json({ error: "text or attachment is required" }, 400);

    // Find integration
    let integration: any = null;

    if (integration_id) {
      const { data } = await adminClient
        .from("channel_integrations")
        .select("id, tenant_id, facebook_page_id, access_token, page_access_token")
        .eq("id", integration_id)
        .maybeSingle();
      integration = data;
    } else if (page_id) {
      const { data } = await adminClient
        .from("channel_integrations")
        .select("id, tenant_id, facebook_page_id, access_token, page_access_token")
        .eq("facebook_page_id", page_id)
        .eq("status", "active")
        .maybeSingle();
      integration = data;
    }

    if (!integration) return json({ error: "No active integration found" }, 404);

    // Use page_access_token if available, otherwise fallback to access_token
    const token = integration.page_access_token || integration.access_token;
    if (!token) return json({ error: "No access token configured" }, 400);

    const fbPageId = integration.facebook_page_id || page_id;
    if (!fbPageId) return json({ error: "No facebook_page_id configured" }, 400);

    // Build message payload
    const messagePayload: any = {
      recipient: { id: recipient_psid },
      messaging_type: "RESPONSE",
    };

    if (text) {
      messagePayload.message = { text };
    } else if (attachment) {
      messagePayload.message = {
        attachment: {
          type: attachment.type || "image", // image, video, audio, file
          payload: { url: attachment.url, is_reusable: true },
        },
      };
    }

    // Send via Graph API
    const res = await fetch(`https://graph.facebook.com/v21.0/${fbPageId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[messenger-send] API error:", JSON.stringify(result));
      return json({
        error: result?.error?.message || `HTTP ${res.status}`,
        code: result?.error?.code,
      }, res.status);
    }

    // Save outgoing message to DB
    await adminClient.from("chat_messages").insert({
      tenant_id: integration.tenant_id,
      sender_id: user.id,
      content: text || `[${attachment?.type || "attachment"}]`,
      content_type: text ? "text" : (attachment?.type || "attachment"),
      message_type: text ? "text" : (attachment?.type || "attachment"),
      channel: "messenger",
      direction: "outgoing",
      timestamp: new Date().toISOString(),
      wa_message_id: result?.message_id || null,
      metadata: {
        provider: "MESSENGER",
        integration_id: integration.id,
        page_id: fbPageId,
        recipient_psid,
      },
    });

    return json({
      success: true,
      message_id: result?.message_id,
      recipient_id: result?.recipient_id,
    });
  } catch (err: any) {
    console.error("[messenger-send] Error:", err);
    return json({ error: err.message }, 500);
  }
});
