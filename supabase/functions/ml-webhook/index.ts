import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ML_API = "https://api.mercadolibre.com";

// ═══════════════════════════════════════════════════════════════
// ML WEBHOOK — Mercado Livre Notifications
//
// Topics handled:
//   messages    — new message in a pack/order conversation
//   questions   — new product question from a buyer
//   orders_v2   — order status change (logged, not processed)
//
// Flow: ML sends notification → we fetch full resource → save to chat_messages
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ML sends GET for verification
  if (req.method === "GET") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const payload = await req.json();
    const { topic, resource, user_id, application_id } = payload;

    console.log(`[ml-webhook] topic=${topic} user_id=${user_id} resource=${resource}`);

    if (!user_id) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Resolve tenant by ml_user_id
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("id, tenant_id, access_token, refresh_token, token_expires_at, ml_user_id, ml_app_id, credentials")
      .eq("ml_user_id", String(user_id))
      .eq("provider", "MERCADOLIVRE")
      .eq("status", "active")
      .maybeSingle();

    if (!integration) {
      console.warn(`[ml-webhook] No integration for ML user ${user_id}`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Check and refresh token if needed
    let accessToken = integration.access_token;
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      console.log(`[ml-webhook] Token expired for user ${user_id}, refreshing...`);
      accessToken = await refreshMLToken(supabase, integration);
      if (!accessToken) {
        console.error(`[ml-webhook] Token refresh failed for user ${user_id}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
    }

    // Process by topic
    switch (topic) {
      case "messages":
        await handleMessages(supabase, integration, resource, accessToken);
        break;
      case "questions":
        await handleQuestions(supabase, integration, resource, accessToken);
        break;
      case "orders_v2":
        console.log(`[ml-webhook] Order event: ${resource} (logged, not processed)`);
        break;
      default:
        console.log(`[ml-webhook] Unhandled topic: ${topic}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("[ml-webhook] Error:", err);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

// ── Handle messages topic ──
async function handleMessages(
  supabase: ReturnType<typeof createClient>,
  integration: any,
  resource: string,
  accessToken: string
) {
  // resource format: /packs/{pack_id}/sellers/{seller_id}/messages
  // or just the notification ID — fetch the actual messages
  try {
    const res = await fetch(`${ML_API}${resource}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`[ml-webhook] Fetch messages failed: ${res.status}`);
      return;
    }

    const data = await res.json();
    const messages = data.messages || [data];

    for (const msg of messages) {
      if (!msg.id) continue;

      const isFromBuyer = msg.from?.user_id !== parseInt(integration.ml_user_id);
      const senderId = msg.from?.user_id ? String(msg.from.user_id) : null;
      const text = msg.text || msg.message_text || "";

      await supabase.from("chat_messages").upsert({
        tenant_id: integration.tenant_id,
        sender_id: senderId,
        content: text,
        content_type: msg.message_attachments?.length ? "attachment" : "text",
        message_type: "text",
        channel: "mercadolivre",
        direction: isFromBuyer ? "incoming" : "outgoing",
        timestamp: msg.date_created || new Date().toISOString(),
        wa_message_id: `ml_msg_${msg.id}`,
        metadata: {
          provider: "MERCADOLIVRE",
          integration_id: integration.id,
          ml_user_id: integration.ml_user_id,
          pack_id: msg.pack_id || null,
          resource,
          raw: msg,
        },
      }, { onConflict: "wa_message_id" }).then(({ error }) => {
        if (error) console.error("[ml-webhook] Store msg error:", error.message);
      });
    }
  } catch (err: any) {
    console.error("[ml-webhook] handleMessages error:", err.message);
  }
}

// ── Handle questions topic ──
async function handleQuestions(
  supabase: ReturnType<typeof createClient>,
  integration: any,
  resource: string,
  accessToken: string
) {
  try {
    // resource: /questions/{question_id}
    const res = await fetch(`${ML_API}${resource}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`[ml-webhook] Fetch question failed: ${res.status}`);
      return;
    }

    const question = await res.json();
    const buyerId = question.from?.id ? String(question.from.id) : null;
    const text = question.text || "";
    const itemId = question.item_id || null;

    // Fetch item title for context
    let itemTitle = "";
    if (itemId) {
      try {
        const itemRes = await fetch(`${ML_API}/items/${itemId}?attributes=title`);
        if (itemRes.ok) {
          const item = await itemRes.json();
          itemTitle = item.title || "";
        }
      } catch { /* ignore */ }
    }

    const content = itemTitle ? `[Pergunta sobre: ${itemTitle}]\n${text}` : text;

    await supabase.from("chat_messages").upsert({
      tenant_id: integration.tenant_id,
      sender_id: buyerId,
      content,
      content_type: "text",
      message_type: "question",
      channel: "mercadolivre",
      direction: "incoming",
      timestamp: question.date_created || new Date().toISOString(),
      wa_message_id: `ml_question_${question.id}`,
      metadata: {
        provider: "MERCADOLIVRE",
        integration_id: integration.id,
        ml_user_id: integration.ml_user_id,
        question_id: question.id,
        item_id: itemId,
        item_title: itemTitle,
        question_status: question.status,
        resource,
        raw: question,
      },
    }, { onConflict: "wa_message_id" }).then(({ error }) => {
      if (error) console.error("[ml-webhook] Store question error:", error.message);
    });

    // If there's an answer, save it too
    if (question.answer?.text) {
      await supabase.from("chat_messages").upsert({
        tenant_id: integration.tenant_id,
        sender_id: integration.ml_user_id,
        content: question.answer.text,
        content_type: "text",
        message_type: "answer",
        channel: "mercadolivre",
        direction: "outgoing",
        timestamp: question.answer.date_created || new Date().toISOString(),
        wa_message_id: `ml_answer_${question.id}`,
        metadata: {
          provider: "MERCADOLIVRE",
          integration_id: integration.id,
          question_id: question.id,
          item_id: itemId,
        },
      }, { onConflict: "wa_message_id" });
    }
  } catch (err: any) {
    console.error("[ml-webhook] handleQuestions error:", err.message);
  }
}

// ── Token refresh ──
async function refreshMLToken(
  supabase: ReturnType<typeof createClient>,
  integration: any
): Promise<string | null> {
  try {
    const mlAppId = integration.ml_app_id || Deno.env.get("ML_APP_ID");
    const mlSecret = (integration.credentials as any)?.client_secret || Deno.env.get("ML_APP_SECRET");

    if (!mlAppId || !mlSecret || !integration.refresh_token) {
      console.error("[ml-webhook] Missing credentials for token refresh");
      return null;
    }

    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: mlAppId,
        client_secret: mlSecret,
        refresh_token: integration.refresh_token,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[ml-webhook] Token refresh failed: ${res.status} ${errText}`);

      // Mark integration as error
      await supabase.from("channel_integrations").update({
        status: "error",
        error_message: `Token refresh failed: ${res.status}`,
      }).eq("id", integration.id);

      return null;
    }

    const tokens = await res.json();

    // Update tokens in DB
    await supabase.from("channel_integrations").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 21600) * 1000).toISOString(),
      status: "active",
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", integration.id);

    console.log(`[ml-webhook] Token refreshed for user ${integration.ml_user_id}`);
    return tokens.access_token;
  } catch (err: any) {
    console.error("[ml-webhook] refreshMLToken error:", err.message);
    return null;
  }
}
