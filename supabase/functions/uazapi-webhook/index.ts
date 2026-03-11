import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Sempre retornar 200 para a uazapi não retentar
  if (req.method !== "POST") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { event, instance, data } = payload;

    console.log(`uazapi-webhook: event=${event}, instance=${instance}`);

    if (!event || !instance) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    switch (event) {
      // ─── Conexão ───────────────────────────────────────────
      case "connection": {
        const instData = data?.instance || data;
        const status = instData?.status ?? data?.state ?? "disconnected";
        const updateData: Record<string, unknown> = {
          status,
          api_updated_at: new Date().toISOString(),
          ultimo_ping: new Date().toISOString(),
        };

        if (instData?.qrcode) updateData.qr_code = instData.qrcode;
        if (instData?.paircode) updateData.pair_code = instData.paircode;
        if (instData?.profileName) updateData.profile_name = instData.profileName;
        if (instData?.profilePicUrl) updateData.profile_pic_url = instData.profilePicUrl;
        if (instData?.phone || data?.phone) updateData.phone_number = instData?.phone || data?.phone;
        if (instData?.isBusiness !== undefined) updateData.is_business = instData.isBusiness;
        if (instData?.plataform) updateData.platform = instData.plataform;
        if (instData?.currentPresence) updateData.current_presence = instData.currentPresence;
        if (instData?.owner) updateData.owner_email = instData.owner;

        if (status === "connected" || status === "open") {
          updateData.qr_code = null;
          updateData.pair_code = null;
        }

        if (status === "disconnected" || status === "close") {
          updateData.last_disconnect = new Date().toISOString();
          updateData.last_disconnect_reason = instData?.lastDisconnectReason || data?.reason || data?.statusReason || null;
        }

        console.log(`uazapi-webhook: connection update for ${instance}:`, JSON.stringify(updateData).substring(0, 300));

        // Try matching by instance_name first, then by instance_token
        const { data: matched } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`)
          .limit(1)
          .single();

        if (matched) {
          await supabase
            .from("whatsapp_instances")
            .update(updateData)
            .eq("id", matched.id);
        } else {
          console.warn(`uazapi-webhook: No instance found for: ${instance}`);
        }

        break;
      }

      // ─── Mensagens novas / histórico ───────────────────────
      case "messages":
      case "messages.upsert": {
        const msgs = Array.isArray(data) ? data : [data];

        for (const msg of msgs) {
          if (!msg?.key?.remoteJid) continue;

          const { error } = await supabase.from("whatsapp_messages").upsert(
            {
              instance_name: instance,
              remote_jid: msg.key.remoteJid,
              message_id: msg.key.id,
              direction: msg.key.fromMe ? "outgoing" : "incoming",
              type: msg.messageType ?? "text",
              body: msg.body ?? msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null,
              media_url: msg.mediaUrl ?? null,
              caption: msg.message?.imageMessage?.caption ?? msg.message?.videoMessage?.caption ?? null,
              status: msg.key.fromMe ? 2 : 4,
              track_source: msg.trackSource ?? null,
              track_id: msg.trackId ?? null,
              raw_payload: msg,
              created_at: msg.messageTimestamp
                ? new Date(msg.messageTimestamp * 1000).toISOString()
                : new Date().toISOString(),
            },
            { onConflict: "message_id" }
          );

          if (error) {
            console.error("uazapi-webhook: message upsert error:", error);
          }
        }

        // Atualizar último ping da instância
        await supabase
          .from("whatsapp_instances")
          .update({ ultimo_ping: new Date().toISOString() })
          .eq("instance_name", instance);

        break;
      }

      // ─── Atualização de status de mensagem ─────────────────
      case "messages_update":
      case "messages.update": {
        const updates = Array.isArray(data) ? data : [data];

        for (const upd of updates) {
          if (!upd?.key?.id) continue;

          const statusMap: Record<string, number> = {
            ERROR: 0,
            PENDING: 1,
            SERVER_ACK: 2,
            DELIVERY_ACK: 3,
            READ: 4,
            PLAYED: 4,
          };

          const newStatus = statusMap[upd.update?.status] ?? undefined;
          if (newStatus !== undefined) {
            await supabase
              .from("whatsapp_messages")
              .update({ status: newStatus })
              .eq("message_id", upd.key.id);
          }
        }
        break;
      }

      // ─── Leads (CRM embutido) ─────────────────────────────
      case "leads": {
        const lead = data;
        if (!lead?.wa_chatid) break;

        await supabase.from("whatsapp_leads").upsert(
          {
            instance_name: instance,
            chat_id: lead.wa_chatid,
            lead_name: lead.lead_name,
            lead_full_name: lead.lead_fullName,
            lead_status: lead.lead_status,
            is_ticket_open: lead.lead_isTicketOpen,
            assigned_attendant_id: lead.lead_assignedAttendant_id,
            kanban_order: lead.lead_kanbanOrder,
            lead_tags: lead.lead_tags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "instance_name,chat_id" }
        );
        break;
      }

      default:
        console.log(`uazapi-webhook: unhandled event '${event}'`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("uazapi-webhook error:", err);
    return new Response("OK", { status: 200, headers: corsHeaders }); // Sempre 200
  }
});
