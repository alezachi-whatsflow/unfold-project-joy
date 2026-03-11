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

    // Get all uazapi instances
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("provedor", "uazapi");

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ error: "No instances" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const inst of instances) {
      const token = inst.instance_token || inst.token_api;
      const serverUrl = inst.server_url || Deno.env.get("UAZAPI_BASE_URL");
      if (!token || !serverUrl) continue;

      // Fetch recent chats via /chat/find
      const chatsRes = await fetch(`${serverUrl}/chat/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify({ sort: "-wa_lastMsgTimestamp", limit: 30 }),
      });

      if (!chatsRes.ok) {
        results.push({ instance: inst.instance_name, error: `chat/find: ${chatsRes.status}` });
        continue;
      }

      const chatsData = await chatsRes.json();
      const chats = Array.isArray(chatsData) ? chatsData : chatsData?.chats || [];
      let totalSaved = 0;

      // For each chat, fetch messages
      for (const chat of (Array.isArray(chats) ? chats : [])) {
        const jid = chat.id || chat.jid;
        if (!jid || jid.includes("@g.us")) continue; // skip groups for now

        const msgsRes = await fetch(`${serverUrl}/chat/fetchMessages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ phone: jid.replace(/@.*/, ""), count: 20 }),
        });

        if (!msgsRes.ok) continue;
        const msgs = await msgsRes.json();

        for (const msg of (Array.isArray(msgs) ? msgs : [])) {
          if (!msg?.key?.remoteJid) continue;

          const { error } = await supabase.from("whatsapp_messages").upsert(
            {
              instance_name: inst.instance_name,
              remote_jid: msg.key.remoteJid,
              message_id: msg.key.id,
              direction: msg.key.fromMe ? "outgoing" : "incoming",
              type: msg.messageType ?? "text",
              body: msg.body ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null,
              media_url: msg.mediaUrl ?? null,
              caption: msg.message?.imageMessage?.caption ?? msg.message?.videoMessage?.caption ?? null,
              status: msg.key.fromMe ? 2 : 4,
              raw_payload: msg,
              created_at: msg.messageTimestamp
                ? new Date(msg.messageTimestamp * 1000).toISOString()
                : new Date().toISOString(),
            },
            { onConflict: "message_id" }
          );

          if (!error) totalSaved++;
        }
      }

      results.push({ instance: inst.instance_name, chatsFetched: chats?.length || 0, messagesSaved: totalSaved });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
