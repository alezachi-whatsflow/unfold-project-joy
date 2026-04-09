/**
 * meta-send-message
 * Sends a WhatsApp message via Meta Cloud API.
 * Uses the access_token from channel_integrations.
 * Saves outgoing message to whatsapp_messages with correct instance_name.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    const { phone_number_id, to, text, template, type, media_url, caption, context_message_id } = await req.json();
    if (!phone_number_id || !to) throw new Error("phone_number_id e to são obrigatórios");

    // Get integration by phone_number_id
    const { data: integration } = await adminClient
      .from("channel_integrations")
      .select("id, tenant_id, access_token, waba_id, status")
      .eq("phone_number_id", phone_number_id)
      .eq("status", "active")
      .single();

    if (!integration) throw new Error("Integração não encontrada ou inativa");

    // Clean phone number (remove +, spaces, dashes)
    const cleanTo = to.replace(/\D/g, "");

    // Build message payload
    let messageBody: any = {
      messaging_product: "whatsapp",
      to: cleanTo,
    };

    // Add context (reply) if provided
    if (context_message_id) {
      messageBody.context = { message_id: context_message_id };
    }

    let msgType = "text";
    let msgBody = "";

    if (template) {
      msgType = "template";
      msgBody = template.name || "";
      messageBody.type = "template";
      messageBody.template = {
        name: template.name,
        language: { code: template.language || "pt_BR" },
        components: template.components || [],
      };
    } else if (type === "audio" && media_url) {
      // Audio requires upload to Media API first (Meta doesn't support webm via link)
      msgType = "audio";
      msgBody = "[Áudio]";
      try {
        // Download audio from our storage
        const audioRes = await fetch(media_url);
        const audioBlob = await audioRes.blob();
        // Upload to Meta Media API
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", audioBlob.type || "audio/ogg");
        formData.append("file", audioBlob, "audio.ogg");
        const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${phone_number_id}/media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${integration.access_token}` },
          body: formData,
        });
        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok || !uploadResult.id) {
          console.error("[meta-send-message] Media upload failed:", JSON.stringify(uploadResult));
          throw new Error(uploadResult.error?.message || "Falha no upload do áudio");
        }
        messageBody.type = "audio";
        messageBody.audio = { id: uploadResult.id };
        console.log(`[meta-send-message] Audio uploaded: ${uploadResult.id}`);
      } catch (uploadErr: any) {
        console.error("[meta-send-message] Audio upload error:", uploadErr.message);
        // Fallback: try sending as document
        messageBody.type = "document";
        messageBody.document = { link: media_url, filename: "audio.webm" };
        msgType = "document";
      }
    } else if (type && media_url && ["image", "video", "document"].includes(type)) {
      msgType = type;
      msgBody = caption || `[${type}]`;
      messageBody.type = type;
      messageBody[type] = { link: media_url };
      if (caption) messageBody[type].caption = caption;
    } else if (text) {
      msgType = "text";
      msgBody = text;
      messageBody.type = "text";
      messageBody.text = { body: text };
    } else {
      throw new Error("text, template ou media_url é obrigatório");
    }

    // Send via Meta Cloud API
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageBody),
      }
    );

    const result = await res.json();

    if (!res.ok || result.error) {
      const errMsg = result.error?.message || `Meta API error (${res.status})`;
      console.error("[meta-send-message] Error:", JSON.stringify(result.error || result));
      throw new Error(errMsg);
    }

    const waMessageId = result.messages?.[0]?.id;
    const instanceName = `cloud_api_${phone_number_id}`;
    const remoteJid = `${cleanTo}@s.whatsapp.net`;

    console.log(`[meta-send-message] Sent to ${cleanTo} via ${phone_number_id}: ${waMessageId}`);

    // Save outgoing message to whatsapp_messages (same instance_name as meta-webhook)
    if (waMessageId) {
      await adminClient.from("whatsapp_messages").upsert({
        message_id: waMessageId,
        instance_name: instanceName,
        remote_jid: remoteJid,
        direction: "outgoing",
        type: msgType,
        body: msgBody,
        media_url: media_url || null,
        caption: caption || null,
        status: 1,
        tenant_id: integration.tenant_id,
        raw_payload: result,
        quoted_message_id: context_message_id || null,
        created_at: new Date().toISOString(),
      }, { onConflict: "message_id" });
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: waMessageId,
      to: cleanTo,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[meta-send-message]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
