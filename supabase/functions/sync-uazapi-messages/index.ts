import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeMessageId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw.replace(/^\d+:/, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

      // Fetch recent chats
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
      const debugInfo: any[] = [];

      for (const chat of chats.slice(0, 15)) {
        const jid = chat.wa_chatid || chat.id || chat.jid;
        if (!jid || jid.includes("@g.us")) continue;

        // Get chat details which includes recent messages
        const detailsRes = await fetch(`${serverUrl}/chat/details`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ id: jid }),
        });

        if (!detailsRes.ok) {
          debugInfo.push({ jid, error: `details: ${detailsRes.status}` });
          continue;
        }

        const details = await detailsRes.json();
        const msgs = details?.messages || details?.msgs || [];

        if (msgs.length === 0) {
          const lastText = chat.wa_lastMsgBody || chat.wa_lastMessageTextVote || chat.wa_lastMsg || "";
          const lastType = chat.wa_lastMessageType || "text";
          const lastSender = String(chat.wa_lastMessageSender || "").toLowerCase();
          const owner = String(chat.owner || "").toLowerCase();
          const fromMe = Boolean(lastSender && owner && lastSender.includes(owner));

          if (lastText || chat.wa_lastMsgTimestamp) {
            const fallbackMessageId = chat.wa_lastMsgId || `${jid}-${chat.wa_lastMsgTimestamp || Date.now()}`;
            const { error } = await supabase.from("whatsapp_messages").upsert(
              {
                instance_name: inst.instance_name,
                remote_jid: chat.wa_chatid || jid,
                message_id: fallbackMessageId,
                direction: fromMe ? "outgoing" : "incoming",
                type: lastType,
                body: lastText,
                status: fromMe ? 2 : 4,
                created_at: chat.wa_lastMsgTimestamp
                  ? new Date(chat.wa_lastMsgTimestamp * 1000).toISOString()
                  : new Date().toISOString(),
              },
              { onConflict: "message_id" }
            );
            if (!error) totalSaved++;
          }
          continue;
        }

        for (const msg of msgs) {
          const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || msg?.chatid || chat.wa_chatid || jid;
          if (!remoteJid) continue;

          const messageId = msg?.key?.id || msg?.id || msg?.messageid || `${remoteJid}-${msg?.messageTimestamp || Date.now()}`;
          const fromMe = Boolean(msg?.key?.fromMe ?? msg?.fromMe ?? false);

          const rawType = msg.messageType ?? msg.type ?? chat.wa_lastMessageType ?? "text";
          const mimetype = msg?.mimetype ?? msg?.content?.mimetype ?? null;
          let normalizedType = String(rawType);

          if ((normalizedType === "media" || normalizedType === "unknown") && mimetype) {
            if (String(mimetype).startsWith("image/")) normalizedType = "image";
            else if (String(mimetype).startsWith("video/")) normalizedType = "video";
            else if (String(mimetype).startsWith("audio/")) normalizedType = "audio";
            else normalizedType = "document";
          }

          const mediaUrl =
            msg.mediaUrl ??
            msg.media?.url ??
            msg.content?.URL ??
            msg.content?.url ??
            msg.message?.imageMessage?.url ??
            msg.message?.videoMessage?.url ??
            msg.message?.documentMessage?.url ??
            msg.message?.audioMessage?.url ??
            null;

          const { error } = await supabase.from("whatsapp_messages").upsert(
            {
              instance_name: inst.instance_name,
              remote_jid: remoteJid,
              message_id: messageId,
              direction: fromMe ? "outgoing" : "incoming",
              type: normalizedType,
              body: msg.body ?? msg.text ?? msg.content?.text ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null,
              media_url: mediaUrl,
              caption: msg.caption ?? msg.message?.imageMessage?.caption ?? msg.message?.videoMessage?.caption ?? msg.content?.caption ?? null,
              status: fromMe ? 2 : 4,
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

      results.push({
        instance: inst.instance_name,
        chatsFetched: chats.length,
        messagesSaved: totalSaved,
        sampleChat: chats[0] ? Object.keys(chats[0]).join(",") : "none",
        sampleChatData: chats[0] ? JSON.stringify(chats[0]).substring(0, 500) : "none",
      });
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
