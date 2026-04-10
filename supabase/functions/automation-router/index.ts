import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function now_br() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function logAutomation(supabase: any, tenant_id: string, instance_name: string, remote_jid: string, triggerName: string, phase: "inicio" | "fim") {
  const emoji = phase === "inicio" ? "\u2699\uFE0F" : "\u2705";
  const label = phase === "inicio" ? "Automa\u00E7\u00E3o iniciada" : "Automa\u00E7\u00E3o finalizada";
  const body = `${emoji} ${label}\nGatilho: ${triggerName}\nData/hora: ${now_br()}`;

  await supabase.from("whatsapp_messages").insert({
    message_id: `auto_${phase}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    instance_name,
    remote_jid,
    direction: "outgoing",
    type: "note",
    body,
    status: 3,
    tenant_id,
    sender_name: "Sistema",
    created_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { tenant_id, instance_name, remote_jid, contact_phone, message_text, message_type, sender_name } = await req.json();

    if (!tenant_id || !remote_jid) return json({ error: "tenant_id and remote_jid required" }, 400);

    // ── Step 0: Handle "end" command ──
    if ((message_text || "").trim().toLowerCase() === "end") {
      const { data: activeSession } = await supabase
        .from("typebot_sessions")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("remote_jid", remote_jid)
        .eq("is_active", true)
        .maybeSingle();

      if (activeSession?.session_id) {
        // Close session, send session ID back via WhatsApp, log fim
        await supabase.from("typebot_sessions").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", activeSession.id);
        await sendMessage(supabase, instance_name, remote_jid, `Sessão finalizada! *${activeSession.session_id}*`);
        const { data: trg } = await supabase.from("automation_triggers").select("name").eq("typebot_id", activeSession.typebot_id).eq("tenant_id", tenant_id).maybeSingle();
        await logAutomation(supabase, tenant_id, instance_name, remote_jid, trg?.name || "Typebot", "fim");
        return json({ action: "session_ended_by_user", session_id: activeSession.session_id });
      } else {
        // No active session
        await sendMessage(supabase, instance_name, remote_jid, `Sessão finalizada! *N/A*`);
        return json({ action: "no_session" });
      }
    }

    // ── Step 1: Check active Typebot session ──
    const { data: activeSession } = await supabase
      .from("typebot_sessions")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("remote_jid", remote_jid)
      .eq("is_active", true)
      .maybeSingle();

    if (activeSession?.session_id) {
      // Continue existing session
      console.log(`[automation-router] Continuing Typebot session ${activeSession.session_id} for ${contact_phone}`);
      const result = await continueTypebotChat(activeSession, message_text, supabase);
      return json({ action: "continued", ...result });
    }

    // ── Step 2: Check automation triggers ──
    const { data: triggers } = await supabase
      .from("automation_triggers")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (!triggers || triggers.length === 0) {
      return json({ action: "no_trigger", message: "No active automation triggers" });
    }

    // Match triggers
    const matchedTrigger = triggers.find((t: any) => {
      if (t.trigger_type === "keyword") {
        const keywords = String(t.trigger_value).split(",").map((k: string) => k.trim().toLowerCase());
        return keywords.some((kw: string) => {
          if (kw === "*") return true; // Wildcard: any message
          return (message_text || "").toLowerCase().includes(kw);
        });
      }
      if (t.trigger_type === "event" && t.trigger_value === "new_conversation") {
        // Check if this is a new conversation (no previous messages in last 24h)
        return true; // Simplified: always matches for now
      }
      return false;
    });

    if (!matchedTrigger) {
      return json({ action: "no_match", message: "No trigger matched" });
    }

    console.log(`[automation-router] Trigger matched: ${matchedTrigger.name} (${matchedTrigger.action_type})`);

    // Log de início da automação (antes de enviar mensagens)
    await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "inicio");

    // ── Step 3: Execute action ──
    if (matchedTrigger.action_type === "reply") {
      // Simple auto-reply
      const replyText = matchedTrigger.action_config?.reply_text;
      if (replyText) {
        await sendMessage(supabase, instance_name, remote_jid, replyText);
      }
      await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "fim");
      return json({ action: "replied", text: replyText });
    }

    if (matchedTrigger.action_type === "typebot" && matchedTrigger.typebot_id) {
      // Resolve typebot_url: use trigger's stored URL, or fetch from typebot_accounts
      let typebotUrl = matchedTrigger.typebot_url || "";
      if (!typebotUrl) {
        const { data: account } = await supabase
          .from("typebot_accounts")
          .select("typebot_url_viewer")
          .eq("tenant_id", tenant_id)
          .maybeSingle();
        typebotUrl = account?.typebot_url_viewer || "";
      }
      if (!typebotUrl) {
        console.error("[automation-router] No Typebot URL found for tenant", tenant_id);
        return json({ error: "Typebot URL not configured" }, 400);
      }

      // Start Typebot flow
      const result = await startTypebotChat(supabase, {
        tenant_id,
        instance_name,
        remote_jid,
        contact_phone,
        sender_name,
        typebot_id: matchedTrigger.typebot_id,
        typebot_url: typebotUrl,
        message_text,
      });
      // If flow completed immediately (no more input), log fim
      if (result.completed) {
        await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "fim");
      }
      return json({ action: "typebot_started", ...result });
    }

    if (matchedTrigger.action_type === "assign") {
      // Auto-assign to department/user
      const departmentId = matchedTrigger.action_config?.department_id;
      const userId = matchedTrigger.action_config?.user_id;
      await supabase.from("whatsapp_leads").upsert({
        chat_id: remote_jid,
        instance_name,
        tenant_id,
        assigned_attendant_id: userId || null,
        lead_status: userId ? "open" : "pending",
        is_ticket_open: true,
      }, { onConflict: "chat_id,instance_name" });
      await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "fim");
      return json({ action: "assigned", department_id: departmentId, user_id: userId });
    }

    if (matchedTrigger.action_type === "tag") {
      // Auto-tag the contact
      const tagName = matchedTrigger.action_config?.tag_name;
      if (tagName) {
        const { data: lead } = await supabase
          .from("whatsapp_leads")
          .select("lead_tags")
          .eq("chat_id", remote_jid)
          .maybeSingle();
        const currentTags = (lead?.lead_tags || []) as string[];
        if (!currentTags.includes(tagName)) {
          await supabase.from("whatsapp_leads").upsert({
            chat_id: remote_jid,
            instance_name,
            tenant_id,
            lead_tags: [...currentTags, tagName],
          }, { onConflict: "chat_id,instance_name" });
        }
      }
      await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "fim");
      return json({ action: "tagged", tag: tagName });
    }

    if (matchedTrigger.action_type === "transfer") {
      // Transfer to department/user
      const departmentId = matchedTrigger.action_config?.department_id;
      const userId = matchedTrigger.action_config?.user_id;
      await supabase.from("whatsapp_leads").upsert({
        chat_id: remote_jid,
        instance_name,
        tenant_id,
        assigned_attendant_id: userId || null,
        lead_status: "open",
        is_ticket_open: true,
      }, { onConflict: "chat_id,instance_name" });
      await logAutomation(supabase, tenant_id, instance_name, remote_jid, matchedTrigger.name, "fim");
      return json({ action: "transferred", department_id: departmentId, user_id: userId });
    }

    return json({ action: "unhandled", trigger: matchedTrigger.name });

  } catch (err: any) {
    console.error("[automation-router] Error:", err);
    return json({ error: err.message }, 500);
  }
});

// ── Typebot API helpers ──

async function startTypebotChat(supabase: any, params: {
  tenant_id: string;
  instance_name: string;
  remote_jid: string;
  contact_phone: string;
  sender_name: string;
  typebot_id: string;
  typebot_url: string;
  message_text: string;
}) {
  const { tenant_id, instance_name, remote_jid, contact_phone, sender_name, typebot_id, typebot_url, message_text } = params;

  // Call Typebot sendMessage API (works for both published and unpublished bots)
  const startRes = await fetch(`${typebot_url}/api/v1/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startParams: { typebot: typebot_id },
      message: message_text || undefined,
      prefilledVariables: {
        nome: sender_name || "",
        telefone: contact_phone || "",
        tenant_id,
        instance_name,
      },
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error(`[automation-router] Typebot sendMessage failed: ${startRes.status} ${errText}`);
    return { error: `Typebot sendMessage failed: ${startRes.status}` };
  }

  const chatData = await startRes.json();
  const sessionId = chatData.sessionId || null;

  // Save session only if we got a sessionId (flow expects more input)
  if (sessionId) {
    await supabase.from("typebot_sessions").upsert({
      tenant_id,
      remote_jid,
      contact_phone,
      instance_name,
      typebot_id,
      session_id: sessionId,
      is_active: true,
      variables: chatData.prefilledVariables || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,remote_jid,typebot_id" });
  }

  // Process and send response messages
  const sentCount = await processTypebotMessages(supabase, chatData.messages || [], instance_name, remote_jid);

  // Check for input block (Typebot waiting for user response)
  const hasInput = chatData.input !== undefined && chatData.input !== null;

  // If flow completed immediately (no input expected), close session and log fim
  if (!hasInput) {
    await supabase.from("typebot_sessions").update({ is_active: false, updated_at: new Date().toISOString() }).eq("tenant_id", tenant_id).eq("remote_jid", remote_jid).eq("typebot_id", typebot_id);
    // Log fim will be handled by the caller
  }

  return { session_id: sessionId, messages_sent: sentCount, waiting_for_input: hasInput, completed: !hasInput };
}

async function continueTypebotChat(session: any, message: string, supabase: any) {
  // Call Typebot continueChat API
  const typebotUrl = session.variables?.typebot_url || "";

  // Get typebot_url and trigger name from automation_triggers
  const { data: trigger } = await supabase
    .from("automation_triggers")
    .select("typebot_url, name")
    .eq("typebot_id", session.typebot_id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();
  const triggerName = trigger?.name || "Typebot";

  let baseUrl = trigger?.typebot_url || Deno.env.get("TYPEBOT_URL") || "";
  if (!baseUrl) {
    // Fallback: fetch viewer URL from typebot_accounts
    const { data: account } = await supabase
      .from("typebot_accounts")
      .select("typebot_url_viewer")
      .eq("tenant_id", session.tenant_id)
      .maybeSingle();
    baseUrl = account?.typebot_url_viewer || "";
  }
  if (!baseUrl) {
    console.error("[automation-router] No Typebot URL configured");
    return { error: "No Typebot URL" };
  }

  const continueRes = await fetch(`${baseUrl}/api/v1/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: session.session_id, message }),
  });

  if (!continueRes.ok) {
    // Session may have expired — close it
    await supabase.from("typebot_sessions").update({ is_active: false }).eq("id", session.id);
    await logAutomation(supabase, session.tenant_id, session.instance_name, session.remote_jid, triggerName, "fim");
    return { error: `continueChat failed: ${continueRes.status}`, session_closed: true };
  }

  const chatData = await continueRes.json();

  // Process messages
  const sentCount = await processTypebotMessages(supabase, chatData.messages || [], session.instance_name, session.remote_jid);

  // Check for handoff/transfer commands
  const handoff = checkForHandoff(chatData);
  if (handoff) {
    // End Typebot session and transfer to human
    await supabase.from("typebot_sessions").update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id);

    // Move to queue or assign
    await supabase.from("whatsapp_leads").upsert({
      chat_id: session.remote_jid,
      instance_name: session.instance_name,
      tenant_id: session.tenant_id,
      lead_status: handoff.user_id ? "open" : "pending",
      assigned_attendant_id: handoff.user_id || null,
      is_ticket_open: true,
    }, { onConflict: "chat_id,instance_name" });

    console.log(`[automation-router] Handoff: session ${session.session_id} → ${handoff.type}`);
    await logAutomation(supabase, session.tenant_id, session.instance_name, session.remote_jid, triggerName, "fim");
    return { handoff: true, type: handoff.type, messages_sent: sentCount };
  }

  // Update session timestamp
  await supabase.from("typebot_sessions").update({
    updated_at: new Date().toISOString(),
    variables: { ...session.variables, ...(chatData.setVariableHistory || []).reduce((acc: any, v: any) => { acc[v.name] = v.value; return acc; }, {}) },
  }).eq("id", session.id);

  // If Typebot says conversation is done (no input expected)
  if (!chatData.input) {
    await supabase.from("typebot_sessions").update({ is_active: false }).eq("id", session.id);
    await logAutomation(supabase, session.tenant_id, session.instance_name, session.remote_jid, triggerName, "fim");
    return { completed: true, messages_sent: sentCount };
  }

  return { messages_sent: sentCount, waiting_for_input: true };
}

async function processTypebotMessages(supabase: any, messages: any[], instanceName: string, remoteJid: string) {
  let sent = 0;
  for (const msg of messages) {
    try {
      if (msg.type === "text" && msg.content?.richText) {
        // Rich text: extract plain text from Typebot's rich text format
        const plainText = msg.content.richText.map((block: any) =>
          block.children?.map((child: any) => child.text || "").join("") || ""
        ).join("\n");
        if (plainText.trim()) {
          await sendMessage(supabase, instanceName, remoteJid, plainText);
          sent++;
        }
      } else if (msg.type === "text" && msg.content?.plainText) {
        await sendMessage(supabase, instanceName, remoteJid, msg.content.plainText);
        sent++;
      } else if (msg.type === "image" && msg.content?.url) {
        await sendMedia(supabase, instanceName, remoteJid, msg.content.url, "image", msg.content.alt || "");
        sent++;
      } else if (msg.type === "video" && msg.content?.url) {
        await sendMedia(supabase, instanceName, remoteJid, msg.content.url, "video", "");
        sent++;
      } else if (msg.type === "audio" && msg.content?.url) {
        await sendMedia(supabase, instanceName, remoteJid, msg.content.url, "audio", "");
        sent++;
      } else if (msg.type === "file" && msg.content?.url) {
        // Typebot sends all files as type "file" — detect real type via HEAD request
        const fileUrl = msg.content.url as string;
        let mediaType = "document";
        let fileName: string | undefined;
        try {
          const headRes = await fetch(fileUrl, { method: "HEAD" });
          const ct = (headRes.headers.get("content-type") || "").toLowerCase();
          if (ct.startsWith("image/")) mediaType = "image";
          else if (ct.startsWith("video/")) mediaType = "video";
          else if (ct.startsWith("audio/")) mediaType = "audio";
          else mediaType = "document";
          // Extract filename from content-disposition or generate from content-type
          const cd = headRes.headers.get("content-disposition") || "";
          const match = cd.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
          if (match) {
            fileName = decodeURIComponent(match[1].trim());
          } else if (mediaType === "document") {
            const extMap: Record<string, string> = {
              "application/pdf": "pdf", "application/vnd.ms-excel": "xls",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
              "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
              "text/csv": "csv", "application/zip": "zip",
            };
            const ext = extMap[ct] || ct.split("/")[1] || "bin";
            const id = Math.random().toString(36).slice(2, 7);
            fileName = `${id}.${ext}`;
          }
        } catch { /* fallback to document */ }
        await sendMedia(supabase, instanceName, remoteJid, fileUrl, mediaType, "", fileName);
        sent++;
      }
      // Add delay between messages for natural feel
      if (sent < messages.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (e: any) {
      console.error(`[automation-router] Send message error:`, e.message);
    }
  }
  return sent;
}

function checkForHandoff(chatData: any): { type: string; department_id?: string; user_id?: string } | null {
  // Check if any message or action indicates handoff
  for (const msg of chatData.messages || []) {
    // Typebot uses "redirect" blocks or custom "Typebot - Set variable" with handoff flags
    if (msg.type === "redirect") return { type: "redirect" };
  }

  // Check set variables for handoff signals
  for (const v of chatData.setVariableHistory || []) {
    if (v.name === "handoff" && v.value === "true") return { type: "handoff" };
    if (v.name === "transfer_to_department") return { type: "transfer", department_id: v.value };
    if (v.name === "transfer_to_user") return { type: "transfer", user_id: v.value };
  }

  return null;
}

// ── Send helpers ──

const UAZAPI_BASE = Deno.env.get("UAZAPI_BASE_URL") || "";

async function saveOutgoingMessage(supabase: any, instanceName: string, remoteJid: string, body: string, type = "text", mediaUrl: string | null = null) {
  let tenantId: string | null = null;

  if (instanceName.startsWith("cloud_api_")) {
    const phoneNumberId = instanceName.replace("cloud_api_", "");
    const { data } = await supabase.from("channel_integrations").select("tenant_id").eq("phone_number_id", phoneNumberId).maybeSingle();
    tenantId = data?.tenant_id;
  } else {
    const { data } = await supabase.from("whatsapp_instances").select("tenant_id").eq("instance_name", instanceName).maybeSingle();
    tenantId = data?.tenant_id;
  }
  if (!tenantId) return;

  await supabase.from("whatsapp_messages").insert({
    message_id: `auto_out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    instance_name: instanceName,
    remote_jid: remoteJid,
    direction: "outgoing",
    type,
    body,
    media_url: mediaUrl,
    status: 2,
    tenant_id: tenantId,
    sender_name: "Automação",
    created_at: new Date().toISOString(),
  });
}

async function sendMessage(supabase: any, instanceName: string, remoteJid: string, text: string) {
  const phone = remoteJid.replace(/@.*$/, "");

  // Cloud API instance (Meta WhatsApp)
  if (instanceName.startsWith("cloud_api_")) {
    const phoneNumberId = instanceName.replace("cloud_api_", "");
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("access_token")
      .eq("phone_number_id", phoneNumberId)
      .eq("status", "active")
      .maybeSingle();
    if (!integration?.access_token) return;

    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    });
    await saveOutgoingMessage(supabase, instanceName, remoteJid, text);
    return;
  }

  // Instagram / Messenger instance
  if (instanceName.startsWith("instagram_") || instanceName.startsWith("messenger_")) {
    const pageId = instanceName.replace(/^(instagram|messenger)_/, "");
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("access_token")
      .or(`facebook_page_id.eq.${pageId},instagram_business_account_id.eq.${pageId}`)
      .eq("status", "active")
      .maybeSingle();
    if (!integration?.access_token) return;

    const recipientId = remoteJid.replace(/@.*$/, "");
    await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    await saveOutgoingMessage(supabase, instanceName, remoteJid, text);
    return;
  }

  // UazAPI instance
  const { data: inst } = await supabase
    .from("whatsapp_instances")
    .select("instance_token, server_url, tenant_id")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (!inst?.instance_token) return;

  const baseUrl = inst.server_url || UAZAPI_BASE;
  if (!baseUrl) return;

  await fetch(`${baseUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, text }),
  });
  // UazAPI webhook already saves outgoing messages — no need to duplicate
}

async function sendMedia(supabase: any, instanceName: string, remoteJid: string, url: string, type: string, caption: string, docName?: string) {
  const phone = remoteJid.replace(/@.*$/, "");

  // Cloud API instance (Meta WhatsApp)
  if (instanceName.startsWith("cloud_api_")) {
    const phoneNumberId = instanceName.replace("cloud_api_", "");
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("access_token")
      .eq("phone_number_id", phoneNumberId)
      .eq("status", "active")
      .maybeSingle();
    if (!integration?.access_token) return;

    const mediaType = ["image", "video", "audio", "document"].includes(type) ? type : "document";
    const mediaPayload: any = { link: url };
    if (caption && mediaType !== "audio") mediaPayload.caption = caption;
    if (docName && mediaType === "document") mediaPayload.filename = docName;

    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: mediaType,
        [mediaType]: mediaPayload,
      }),
    });
    await saveOutgoingMessage(supabase, instanceName, remoteJid, caption || `[${mediaType}]`, mediaType, url);
    return;
  }

  // UazAPI instance
  const { data: inst } = await supabase
    .from("whatsapp_instances")
    .select("instance_token, server_url, tenant_id")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (!inst?.instance_token) return;

  const baseUrl = inst.server_url || UAZAPI_BASE;
  if (!baseUrl) return;

  await fetch(`${baseUrl}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, type, file: url, text: caption, ...(docName ? { docName } : {}) }),
  });
  // UazAPI webhook already saves outgoing messages — no need to duplicate
}
