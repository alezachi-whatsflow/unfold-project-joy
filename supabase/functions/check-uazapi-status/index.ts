import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("provedor", "uazapi")
      .limit(1)
      .single();

    if (!inst) {
      return new Response(JSON.stringify({ error: "No instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = inst.instance_token || inst.token_api;
    const serverUrl = inst.server_url;

    // Check webhook status
    const webhookRes = await fetch(`${serverUrl}/webhook`, {
      method: "GET",
      headers: { "Content-Type": "application/json", token },
    });

    const webhookData = await webhookRes.text();

    // Check instance status
    const statusRes = await fetch(`${serverUrl}/instance/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json", token },
    });

    const statusData = await statusRes.text();

    return new Response(JSON.stringify({
      instance: inst.instance_name,
      webhook: { status: webhookRes.status, data: webhookData.substring(0, 500) },
      instanceStatus: { status: statusRes.status, data: statusData.substring(0, 500) },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
