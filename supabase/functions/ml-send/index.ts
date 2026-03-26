import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ML_API = "https://api.mercadolibre.com";

// ═══════════════════════════════════════════════════════════════
// ML SEND — Send messages and answer questions on Mercado Livre
//
// Modes:
//   { type: "message", pack_id, buyer_id, text }
//   { type: "answer", question_id, text }
//
// Auto-refreshes token if expired.
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { type, pack_id, buyer_id, question_id, text, tenant_id, integration_id } = body;

    if (!text) return json({ error: "text is required" }, 400);
    if (!type) return json({ error: "type is required (message or answer)" }, 400);

    // Find integration
    let integration: any = null;
    if (integration_id) {
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, access_token, refresh_token, token_expires_at, ml_user_id, ml_app_id")
        .eq("id", integration_id)
        .maybeSingle();
      integration = data;
    } else if (tenant_id) {
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, access_token, refresh_token, token_expires_at, ml_user_id, ml_app_id")
        .eq("tenant_id", tenant_id)
        .eq("provider", "MERCADOLIVRE")
        .eq("status", "active")
        .maybeSingle();
      integration = data;
    }

    if (!integration) return json({ error: "No active ML integration found" }, 404);

    // Check and refresh token
    let accessToken = integration.access_token;
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      accessToken = await refreshToken(supabase, integration);
      if (!accessToken) return json({ error: "Token expired and refresh failed" }, 401);
    }

    let result: any;

    if (type === "message") {
      // Send message to pack conversation
      if (!pack_id) return json({ error: "pack_id is required for messages" }, 400);

      const res = await fetch(`${ML_API}/messages/packs/${pack_id}/sellers/${integration.ml_user_id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { user_id: integration.ml_user_id },
          to: buyer_id ? { user_id: buyer_id } : undefined,
          text,
        }),
      });

      result = await res.json();

      if (!res.ok) {
        return json({ error: result?.message || `ML API ${res.status}`, details: result }, res.status);
      }

      // Save outgoing message
      await supabase.from("chat_messages").insert({
        tenant_id: integration.tenant_id,
        sender_id: user.id,
        content: text,
        content_type: "text",
        message_type: "text",
        channel: "mercadolivre",
        direction: "outgoing",
        timestamp: new Date().toISOString(),
        wa_message_id: `ml_msg_${result.id || Date.now()}`,
        metadata: {
          provider: "MERCADOLIVRE",
          integration_id: integration.id,
          pack_id,
          buyer_id,
        },
      });

    } else if (type === "answer") {
      // Answer a product question
      if (!question_id) return json({ error: "question_id is required for answers" }, 400);

      const res = await fetch(`${ML_API}/answers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: parseInt(question_id),
          text,
        }),
      });

      result = await res.json();

      if (!res.ok) {
        return json({ error: result?.message || `ML API ${res.status}`, details: result }, res.status);
      }

      // Save outgoing answer
      await supabase.from("chat_messages").insert({
        tenant_id: integration.tenant_id,
        sender_id: user.id,
        content: text,
        content_type: "text",
        message_type: "answer",
        channel: "mercadolivre",
        direction: "outgoing",
        timestamp: new Date().toISOString(),
        wa_message_id: `ml_answer_${question_id}`,
        metadata: {
          provider: "MERCADOLIVRE",
          integration_id: integration.id,
          question_id,
        },
      });

    } else {
      return json({ error: `Unknown type: ${type}. Use 'message' or 'answer'` }, 400);
    }

    return json({ success: true, data: result });
  } catch (err: any) {
    console.error("[ml-send] Error:", err);
    return json({ error: err.message }, 500);
  }
});

// ── Token refresh ──
async function refreshToken(
  supabase: ReturnType<typeof createClient>,
  integration: any
): Promise<string | null> {
  const mlAppId = Deno.env.get("ML_APP_ID") || integration.ml_app_id;
  const mlSecret = Deno.env.get("ML_APP_SECRET");

  if (!mlAppId || !mlSecret || !integration.refresh_token) return null;

  try {
    const res = await fetch(`${ML_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: mlAppId,
        client_secret: mlSecret,
        refresh_token: integration.refresh_token,
      }),
    });

    if (!res.ok) return null;

    const tokens = await res.json();

    await supabase.from("channel_integrations").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 21600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", integration.id);

    return tokens.access_token;
  } catch {
    return null;
  }
}
