import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // GET = webhook verification from Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Look up the verify token in meta_connections
      const { data: conn } = await supabase
        .from("meta_connections")
        .select("webhook_verify_token")
        .eq("webhook_verify_token", token)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (conn) {
        // Mark webhook as configured
        await supabase
          .from("meta_connections")
          .update({ webhook_configured: true })
          .eq("webhook_verify_token", token);

        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST = incoming webhook events
  if (req.method === "POST") {
    try {
      const body = await req.json();

      if (body.object !== "whatsapp_business_account") {
        return new Response("Not a WhatsApp event", { status: 404, headers: corsHeaders });
      }

      for (const entry of body.entry || []) {
        const wabaId = entry.id;

        // Find the meta connection for this WABA
        const { data: conn } = await supabase
          .from("meta_connections")
          .select("*")
          .eq("waba_id", wabaId)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!conn) continue;

        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const value = change.value;
            const phoneNumberId = value.metadata?.phone_number_id;

            // Process incoming messages
            for (const message of value.messages || []) {
              const remoteJid = `${message.from}@s.whatsapp.net`;
              const messageId = message.id;

              let body = "";
              let type = message.type || "text";
              let mediaUrl = null;
              let caption = null;

              if (type === "text") {
                body = message.text?.body || "";
              } else if (type === "image") {
                body = "[imagem]";
                mediaUrl = message.image?.id || null; // Media ID, needs download
                caption = message.image?.caption || null;
              } else if (type === "video") {
                body = "[vídeo]";
                mediaUrl = message.video?.id || null;
                caption = message.video?.caption || null;
              } else if (type === "audio" || type === "voice") {
                body = "[áudio]";
                mediaUrl = message.audio?.id || message.voice?.id || null;
                type = "audio";
              } else if (type === "document") {
                body = message.document?.filename || "[documento]";
                mediaUrl = message.document?.id || null;
                caption = message.document?.caption || null;
              } else if (type === "location") {
                body = `[localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
              } else if (type === "contacts") {
                body = `[contato: ${message.contacts?.[0]?.name?.formatted_name || ""}]`;
              } else if (type === "sticker") {
                body = "[figurinha]";
                mediaUrl = message.sticker?.id || null;
              } else if (type === "reaction") {
                body = message.reaction?.emoji || "[reação]";
              }

              // Get contact name
              const contactName = value.contacts?.find((c: any) => c.wa_id === message.from)?.profile?.name || null;

              // Upsert into whatsapp_messages
              await supabase.from("whatsapp_messages").upsert({
                message_id: messageId,
                instance_name: `meta:${phoneNumberId}`,
                remote_jid: remoteJid,
                direction: "incoming",
                type,
                body,
                caption,
                media_url: mediaUrl,
                status: 0,
                track_source: "meta",
                raw_payload: message,
              }, { onConflict: "message_id" });

              // Upsert contact info
              if (contactName) {
                await supabase.from("whatsapp_contacts").upsert({
                  jid: remoteJid,
                  push_name: contactName,
                  name: contactName,
                  instance_name: `meta:${phoneNumberId}`,
                }, { onConflict: "jid" });
              }
            }

            // Process status updates
            for (const status of value.statuses || []) {
              const statusMap: Record<string, number> = {
                sent: 1,
                delivered: 2,
                read: 3,
                failed: -1,
              };
              const statusNum = statusMap[status.status] ?? 0;

              await supabase
                .from("whatsapp_messages")
                .update({ status: statusNum, updated_at: new Date().toISOString() })
                .eq("message_id", status.id);
            }
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("meta-webhook error:", err);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
