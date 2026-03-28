import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { tenant_id, instance_name, remote_jid, contact_phone, message_text, message_type, sender_name } = await req.json();

    if (!tenant_id || !remote_jid) return json({ error: "tenant_id and remote_jid required" }, 400);

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

    // ── Step 3: Execute action ──
    if (matchedTrigger.action_type === "reply") {
      // Simple auto-reply
      const replyText = matchedTrigger.action_config?.reply_text;
      if (replyText) {
        await sendViaUazapi(supabase, instance_name, remote_jid, replyText);
      }
      return json({ action: "replied", text: replyText });
    }

    if (matchedTrigger.action_type === "webhook" && matchedTrigger.typebot_id && matchedTrigger.typebot_url) {
      // Start Typebot flow
      const result = await startTypebotChat(supabase, {
        tenant_id,
        instance_name,
        remote_jid,
        contact_phone,
        sender_name,
        typebot_id: matchedTrigger.typebot_id,
        typebot_url: matchedTrigger.typebot_url,
        message_text,
      });
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

  // Call Typebot startChat API
  const startRes = await fetch(`${typebot_url}/api/v1/typebots/${typebot_id}/startChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message_text,
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
    console.error(`[automation-router] Typebot startChat failed: ${startRes.status} ${errText}`);
    return { error: `Typebot startChat failed: ${startRes.status}` };
  }

  const chatData = await startRes.json();
  const sessionId = chatData.sessionId;

  // Save session
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

  // Process and send response messages
  const sentCount = await processTypebotMessages(supabase, chatData.messages || [], instance_name, remote_jid);

  // Check for input block (Typebot waiting for user response)
  const hasInput = chatData.input !== undefined && chatData.input !== null;

  return { session_id: sessionId, messages_sent: sentCount, waiting_for_input: hasInput };
}

async function continueTypebotChat(session: any, message: string, supabase: any) {
  // Call Typebot continueChat API
  const typebotUrl = session.variables?.typebot_url || "";

  // Get typebot_url from automation_triggers
  const { data: trigger } = await supabase
    .from("automation_triggers")
    .select("typebot_url")
    .eq("typebot_id", session.typebot_id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();

  const baseUrl = trigger?.typebot_url || Deno.env.get("TYPEBOT_URL") || "";
  if (!baseUrl) {
    console.error("[automation-router] No Typebot URL configured");
    return { error: "No Typebot URL" };
  }

  const continueRes = await fetch(`${baseUrl}/api/v1/sessions/${session.session_id}/continueChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!continueRes.ok) {
    // Session may have expired — close it
    await supabase.from("typebot_sessions").update({ is_active: false }).eq("id", session.id);
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
          await sendViaUazapi(supabase, instanceName, remoteJid, plainText);
          sent++;
        }
      } else if (msg.type === "text" && msg.content?.plainText) {
        await sendViaUazapi(supabase, instanceName, remoteJid, msg.content.plainText);
        sent++;
      } else if (msg.type === "image" && msg.content?.url) {
        await sendMediaViaUazapi(supabase, instanceName, remoteJid, msg.content.url, "image", msg.content.alt || "");
        sent++;
      } else if (msg.type === "video" && msg.content?.url) {
        await sendMediaViaUazapi(supabase, instanceName, remoteJid, msg.content.url, "video", "");
        sent++;
      } else if (msg.type === "audio" && msg.content?.url) {
        await sendMediaViaUazapi(supabase, instanceName, remoteJid, msg.content.url, "audio", "");
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

async function sendViaUazapi(supabase: any, instanceName: string, remoteJid: string, text: string) {
  const { data: inst } = await supabase
    .from("whatsapp_instances")
    .select("instance_token, server_url")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (!inst) return;

  const phone = remoteJid.replace(/@.*$/, "");
  await fetch(`${inst.server_url}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, text }),
  });
}

async function sendMediaViaUazapi(supabase: any, instanceName: string, remoteJid: string, url: string, type: string, caption: string) {
  const { data: inst } = await supabase
    .from("whatsapp_instances")
    .select("instance_token, server_url")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (!inst) return;

  const phone = remoteJid.replace(/@.*$/, "");
  await fetch(`${inst.server_url}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, file: url, text: caption }),
  });
}
