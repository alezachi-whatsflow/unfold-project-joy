import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// SEND CSAT — Sends satisfaction survey after conversation resolution
//
// Body: { conversation_id, phone, instance_name }
// OR triggered automatically when conversation status → "resolved"
//
// Sends a WhatsApp message with rating buttons (1-5 stars)
// Records in csat_ratings when customer replies
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { conversation_id, phone, instance_name, tenant_id } = await req.json();

    if (!phone || !instance_name) {
      return new Response(JSON.stringify({ error: "phone and instance_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get instance token
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token")
      .eq("instance_name", instance_name)
      .maybeSingle();

    if (!inst?.instance_token) {
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL") || "https://whatsflow.uazapi.com";

    // Send CSAT message via uazapi
    const csatMessage = `⭐ *Avaliação de Atendimento*\n\nOlá! Seu atendimento foi finalizado.\n\nPor favor, avalie de 1 a 5 como foi sua experiência:\n\n1️⃣ Péssimo\n2️⃣ Ruim\n3️⃣ Regular\n4️⃣ Bom\n5️⃣ Excelente\n\n_Responda apenas com o número de 1 a 5._`;

    const res = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ number: phone, text: csatMessage }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Send failed: ${err}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark conversation as CSAT sent
    if (conversation_id) {
      await supabase.from("conversations").update({ csat_sent: true }).eq("id", conversation_id);
    }

    return new Response(JSON.stringify({ success: true, message: "CSAT survey sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
