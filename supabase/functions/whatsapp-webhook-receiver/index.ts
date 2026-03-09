import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface NormalizedMessage {
  session_id: string;
  direcao: "recebido" | "enviado";
  conversa_id: string;
  tipo: string;
  conteudo: string;
  status: string;
  origem: string;
  tenant_id: string;
}

function normalizeZapi(payload: any, sessionId: string, origem: string, tenantId: string): NormalizedMessage | null {
  if (!payload?.phone) return null;
  const phone = payload.phone.replace(/\D/g, "");
  return {
    session_id: sessionId,
    direcao: payload.fromMe ? "enviado" : "recebido",
    conversa_id: phone,
    tipo: payload.image ? "image" : payload.audio ? "audio" : payload.document ? "doc" : "text",
    conteudo: payload.text?.message || payload.caption || payload.body || "",
    status: "delivered",
    origem,
    tenant_id: tenantId,
  };
}

function normalizeUazapi(payload: any, sessionId: string, origem: string, tenantId: string): NormalizedMessage | null {
  const msg = payload?.message || payload;
  if (!msg) return null;
  const phone = (msg.from || msg.phone || "").replace(/\D/g, "");
  if (!phone) return null;
  return {
    session_id: sessionId,
    direcao: msg.fromMe ? "enviado" : "recebido",
    conversa_id: phone,
    tipo: msg.type === "image" ? "image" : msg.type === "audio" || msg.type === "ptt" ? "audio" : msg.type === "document" ? "doc" : "text",
    conteudo: msg.body || msg.text || msg.caption || "",
    status: "delivered",
    origem,
    tenant_id: tenantId,
  };
}

function normalizeEvolution(payload: any, sessionId: string, origem: string, tenantId: string): NormalizedMessage | null {
  const data = payload?.data || payload;
  const key = data?.key || {};
  const msg = data?.message || {};
  const phone = (key.remoteJid || "").replace(/@.*/, "").replace(/\D/g, "");
  if (!phone) return null;
  const type = msg.imageMessage ? "image" : msg.audioMessage ? "audio" : msg.documentMessage ? "doc" : "text";
  const content = msg.conversation || msg.extendedTextMessage?.text || msg.caption || "";
  return {
    session_id: sessionId,
    direcao: key.fromMe ? "enviado" : "recebido",
    conversa_id: phone,
    tipo: type,
    conteudo: content,
    status: "delivered",
    origem,
    tenant_id: tenantId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected: /whatsapp-webhook-receiver/{session_id} or /whatsapp-webhook-receiver/{session_id}/{provedor}
    const sessionId = pathParts[1] || url.searchParams.get("session_id") || "";
    const provedorHint = pathParts[2] || url.searchParams.get("provedor") || "";

    if (!sessionId) return json({ error: "session_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup instance
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (!inst) return json({ error: "Instance not found" }, 404);

    const provedor = provedorHint || inst.provedor;
    const payload = await req.json();
    let normalized: NormalizedMessage | null = null;

    if (provedor === "zapi") normalized = normalizeZapi(payload, sessionId, inst.uso_principal, inst.tenant_id);
    else if (provedor === "uazapi") normalized = normalizeUazapi(payload, sessionId, inst.uso_principal, inst.tenant_id);
    else if (provedor === "evolution") normalized = normalizeEvolution(payload, sessionId, inst.uso_principal, inst.tenant_id);

    if (!normalized) return json({ ok: true, saved: false, reason: "Could not normalize" });

    // Try to find lead by phone
    const phone = normalized.conversa_id;
    const { data: lead } = await supabase
      .from("business_leads")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    const { error: insertErr } = await supabase.from("message_logs").insert({
      session_id: normalized.session_id,
      conversa_id: normalized.conversa_id,
      direcao: normalized.direcao,
      tipo: normalized.tipo,
      conteudo: normalized.conteudo,
      status: normalized.status,
      origem: normalized.origem,
      tenant_id: normalized.tenant_id,
      lead_id: lead?.id || null,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return json({ error: "Failed to save message" }, 500);
    }

    // Update instance ping
    await supabase.from("whatsapp_instances").update({
      ultimo_ping: new Date().toISOString(),
    }).eq("id", inst.id);

    return json({ ok: true, saved: true, conversa_id: normalized.conversa_id });
  } catch (err) {
    console.error("webhook-receiver error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
