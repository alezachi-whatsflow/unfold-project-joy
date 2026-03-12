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
    const { action, phone, message, media_url, media_type, phone_number_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get the active meta connection (use phone_number_id if provided)
    let query = supabase
      .from("meta_connections")
      .select("*")
      .eq("is_active", true);

    if (phone_number_id) {
      query = query.eq("phone_number_id", phone_number_id);
    }

    const { data: conn } = await query.limit(1).single();

    if (!conn || !conn.access_token) {
      return new Response(
        JSON.stringify({ ok: false, error: "No active Meta connection found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = conn.access_token;
    const pnId = conn.phone_number_id;
    const cleanPhone = phone.replace(/\D/g, "");

    let messagePayload: any;

    switch (action) {
      case "send-text":
        messagePayload = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
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

    // Send via Meta Graph API
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
      console.error("Meta API error:", result);
      return new Response(
        JSON.stringify({ ok: false, error: result.error?.message || "Meta API error" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = result.messages?.[0]?.id;
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    // Save outgoing message to whatsapp_messages
    if (waMessageId) {
      await supabase.from("whatsapp_messages").upsert({
        message_id: waMessageId,
        instance_name: `meta:${pnId}`,
        remote_jid: remoteJid,
        direction: "outgoing",
        type: action === "send-text" ? "text" : (media_type || "text"),
        body: message || "",
        media_url: media_url || null,
        status: 1,
        track_source: "meta",
        raw_payload: result,
      }, { onConflict: "message_id" });
    }

    return new Response(
      JSON.stringify({ ok: true, success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("meta-proxy error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
