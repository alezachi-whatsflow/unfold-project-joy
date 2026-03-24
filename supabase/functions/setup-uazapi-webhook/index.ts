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

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/uazapi-webhook`;

    // Get all uazapi instances
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("provedor", "uazapi");

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ error: "No uazapi instances found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const inst of instances) {
      const token = inst.instance_token || inst.token_api;
      const serverUrl = inst.server_url || Deno.env.get("UAZAPI_BASE_URL");

      if (!token || !serverUrl) {
        results.push({ instance: inst.instance_name, error: "Missing token or server_url" });
        continue;
      }

      // Set webhook on uazapi
      const res = await fetch(`${serverUrl}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: [
            "messages",
            "messages.upsert",
            "messages_update",
            "messages.update",
            "message.update",
            "message_ack",
            "message-ack",
            "ack",
            "message_status",
            "status",
            "connection",
            "leads",
          ],
        }),
      });

      const resText = await res.text();
      console.log(`Webhook set for ${inst.instance_name}: ${res.status} ${resText}`);

      // Update DB
      await supabase
        .from("whatsapp_instances")
        .update({ webhook_url: webhookUrl })
        .eq("id", inst.id);

      results.push({
        instance: inst.instance_name,
        status: res.status,
        response: resText.substring(0, 200),
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("setup-uazapi-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
