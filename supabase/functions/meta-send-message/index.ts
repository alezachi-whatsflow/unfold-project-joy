/**
 * meta-send-message
 * Sends a WhatsApp message via Meta Cloud API.
 * Uses the access_token from channel_integrations.
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

    const { phone_number_id, to, text, template } = await req.json();
    if (!phone_number_id || !to) throw new Error("phone_number_id e to são obrigatórios");

    // Get integration by phone_number_id
    const { data: integration } = await adminClient
      .from("channel_integrations")
      .select("id, access_token, waba_id, status")
      .eq("phone_number_id", phone_number_id)
      .eq("status", "active")
      .single();

    if (!integration) throw new Error("Integração não encontrada ou inativa");

    // Clean phone number (remove +, spaces, dashes)
    const cleanTo = to.replace(/\D/g, "");

    // Build message payload
    let messageBody: any;

    if (template) {
      // Template message
      messageBody = {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language || "pt_BR" },
          components: template.components || [],
        },
      };
    } else if (text) {
      // Text message
      messageBody = {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { body: text },
      };
    } else {
      throw new Error("text ou template é obrigatório");
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

    console.log(`[meta-send-message] Sent to ${cleanTo} via ${phone_number_id}: ${result.messages?.[0]?.id}`);

    return new Response(JSON.stringify({
      success: true,
      message_id: result.messages?.[0]?.id,
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
