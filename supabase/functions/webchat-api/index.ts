import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// WEBCHAT API — Public endpoint for website live chat widgets
//
// NO authentication required (anonymous visitors).
// Uses service_role internally for DB operations.
// tenant_id identifies which customer owns the widget.
//
// Actions:
//   init          — create/resume session, return config + history
//   send_message  — visitor sends a message
//   get_messages  — poll for new messages (agent replies)
//   close         — close the session
//   typing        — notify agent that visitor is typing
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service role: bypasses RLS for anonymous access
  );

  try {
    const body = await req.json();
    const { action, tenant_id, visitor_id, session_id, text, visitor_name, visitor_email, page_url, after_timestamp } = body;

    if (!action) return json({ error: "action is required" }, 400);
    if (!tenant_id) return json({ error: "tenant_id is required" }, 400);

    // Validate tenant exists
    const { data: tenant } = await supabase.from("tenants").select("id, name").eq("id", tenant_id).maybeSingle();
    if (!tenant) return json({ error: "Invalid tenant" }, 404);

    switch (action) {
      // ── INIT: Create or resume session ──
      case "init": {
        if (!visitor_id) return json({ error: "visitor_id is required" }, 400);

        // Get widget config
        const { data: config } = await supabase
          .from("webchat_config")
          .select("*")
          .eq("tenant_id", tenant_id)
          .maybeSingle();

        if (config && !config.is_enabled) {
          return json({ error: "Webchat is disabled for this tenant", disabled: true }, 403);
        }

        // Upsert session
        const { data: session, error: sessErr } = await supabase
          .from("webchat_sessions")
          .upsert({
            tenant_id,
            visitor_id,
            visitor_name: visitor_name || null,
            visitor_email: visitor_email || null,
            page_url: page_url || null,
            referrer: body.referrer || null,
            user_agent: body.user_agent || null,
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "tenant_id,visitor_id" })
          .select("id, status, created_at, visitor_name, assigned_to")
          .single();

        if (sessErr) return json({ error: sessErr.message }, 500);

        // Get recent messages
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("id, content, content_type, direction, timestamp, sender_id, metadata")
          .eq("webchat_session_id", session.id)
          .order("timestamp", { ascending: true })
          .limit(50);

        return json({
          session_id: session.id,
          status: session.status,
          visitor_name: session.visitor_name,
          config: {
            widget_color: config?.widget_color || "#11bc76",
            welcome_message: config?.welcome_message || "Olá! Como posso ajudar?",
            ask_name: config?.ask_name ?? true,
            ask_email: config?.ask_email ?? false,
          },
          messages: (messages || []).map((m) => ({
            id: m.id,
            text: m.content,
            type: m.content_type,
            direction: m.direction === "incoming" ? "visitor" : "agent",
            timestamp: m.timestamp,
            sender: m.direction === "incoming" ? "visitor" : (m.metadata as any)?.agent_name || "Agente",
          })),
        });
      }

      // ── SEND MESSAGE: Visitor sends a message ──
      case "send_message": {
        if (!session_id) return json({ error: "session_id is required" }, 400);
        if (!text?.trim()) return json({ error: "text is required" }, 400);

        // Verify session exists and is active
        const { data: session } = await supabase
          .from("webchat_sessions")
          .select("id, tenant_id, status")
          .eq("id", session_id)
          .eq("tenant_id", tenant_id)
          .maybeSingle();

        if (!session) return json({ error: "Session not found" }, 404);
        if (session.status === "closed") return json({ error: "Session is closed" }, 400);

        // Save message
        const { data: msg, error: msgErr } = await supabase.from("chat_messages").insert({
          tenant_id,
          webchat_session_id: session_id,
          sender_id: body.visitor_id || "visitor",
          content: text.trim(),
          content_type: "text",
          message_type: "text",
          channel: "webchat",
          direction: "incoming", // From visitor's perspective → incoming to the system
          timestamp: new Date().toISOString(),
          wa_message_id: `wc_${session_id}_${Date.now()}`,
          metadata: {
            provider: "WEBCHAT",
            session_id,
            visitor_name: body.visitor_name || null,
          },
        }).select("id, timestamp").single();

        if (msgErr) return json({ error: msgErr.message }, 500);

        // Update session last_message_at
        await supabase.from("webchat_sessions").update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", session_id);

        return json({ success: true, message_id: msg.id, timestamp: msg.timestamp });
      }

      // ── GET MESSAGES: Poll for agent replies ──
      case "get_messages": {
        if (!session_id) return json({ error: "session_id is required" }, 400);

        let query = supabase
          .from("chat_messages")
          .select("id, content, content_type, direction, timestamp, sender_id, metadata")
          .eq("webchat_session_id", session_id)
          .order("timestamp", { ascending: true });

        // If after_timestamp provided, only return new messages
        if (after_timestamp) {
          query = query.gt("timestamp", after_timestamp);
        } else {
          query = query.limit(50);
        }

        const { data: messages } = await query;

        return json({
          messages: (messages || []).map((m) => ({
            id: m.id,
            text: m.content,
            type: m.content_type,
            direction: m.direction === "incoming" ? "visitor" : "agent",
            timestamp: m.timestamp,
            sender: m.direction === "incoming" ? "visitor" : (m.metadata as any)?.agent_name || "Agente",
          })),
        });
      }

      // ── CLOSE: End the session ──
      case "close": {
        if (!session_id) return json({ error: "session_id is required" }, 400);

        await supabase.from("webchat_sessions").update({
          status: "closed",
          updated_at: new Date().toISOString(),
        }).eq("id", session_id).eq("tenant_id", tenant_id);

        return json({ success: true });
      }

      // ── TYPING: Notify agent ──
      case "typing": {
        // Could broadcast via Realtime channel — for now just acknowledge
        return json({ success: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("[webchat-api] Error:", err);
    return json({ error: err.message }, 500);
  }
});
