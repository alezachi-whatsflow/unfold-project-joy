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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, instance_id } = body as {
      action: string;
      instance_id: string;
      [k: string]: unknown;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch instance from DB
    const { data: inst, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instance_id)
      .single();

    if (instErr || !inst) return json({ error: "Instância não encontrada", success: false });

    const provedor = inst.provedor as string;
    const token = inst.token_api as string;
    const instanceApiId = inst.instance_id_api as string;
    const sessionId = inst.session_id as string;
    const serverUrl = (inst.server_url as string) || "";

    // ─── Z-API ───
    if (provedor === "zapi") {
      const base = `https://api.z-api.io/instances/${instanceApiId}/token/${token}`;

      if (action === "qr-code") {
        const r = await fetch(`${base}/qr-code/image`);
        if (!r.ok) return json({ error: `Z-API QR error ${r.status}`, success: false });
        const d = await r.json();
        return json({ qr_base64: d.value || d.image || null, raw: d });
      }

      if (action === "status") {
        const r = await fetch(`${base}/status`);
        if (!r.ok) return json({ error: `Z-API status error ${r.status}`, success: false });
        const d = await r.json();
        const connected = d.connected === true || d.status === "CONNECTED";
        if (connected) {
          await supabase.from("whatsapp_instances").update({
            status: "connected",
            ultimo_ping: new Date().toISOString(),
            numero: d.smartPhone || d.phone || inst.numero,
          }).eq("id", instance_id);
        }
        return json({ connected, phone: d.smartPhone || d.phone, raw: d });
      }

      if (action === "send-text") {
        const { phone, message } = body as { phone: string; message: string };
        const r = await fetch(`${base}/send-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, message }),
        });
        const d = await r.json();
        if (!r.ok) return json({ error: `Z-API send error`, raw: d, success: false });
        return json({ success: true, raw: d });
      }
    }

    // ─── uazapi ───
    if (provedor === "uazapi") {
      if (action === "qr-code") {
        // Try to get QR first
        let r = await fetch(
          `https://api.uazapi.com/instance/qrcode?session=${sessionId}`,
          { headers: { token } }
        );
        // If 404, create instance first then retry
        if (r.status === 404) {
          const cr = await fetch("https://api.uazapi.com/instance/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ session: sessionId, sessionKey: sessionId }),
          });
          const cd = await cr.json();
          console.log("uazapi create-instance result:", JSON.stringify(cd));
          // Retry QR after creation
          r = await fetch(
            `https://api.uazapi.com/instance/qrcode?session=${sessionId}`,
            { headers: { token } }
          );
        }
        if (!r.ok) return json({ error: `uazapi QR error ${r.status}`, success: false });
        const d = await r.json();
        return json({ qr_base64: d.qrcode || d.value || null, raw: d });
      }

      if (action === "status") {
        const r = await fetch(
          `https://api.uazapi.com/instance/status?session=${sessionId}`,
          { headers: { token } }
        );
        if (!r.ok) return json({ error: `uazapi status error ${r.status}`, success: false });
        const d = await r.json();
        const connected = d.status === "CONNECTED" || d.connected === true;
        if (connected) {
          await supabase.from("whatsapp_instances").update({
            status: "connected",
            ultimo_ping: new Date().toISOString(),
          }).eq("id", instance_id);
        }
        return json({ connected, raw: d });
      }

      if (action === "send-text") {
        const { phone, message } = body as { phone: string; message: string };
        const r = await fetch("https://api.uazapi.com/message/send-text", {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ session: sessionId, phone, text: message }),
        });
        const d = await r.json();
        if (!r.ok) return json({ error: `uazapi send error`, raw: d, success: false });
        return json({ success: true, raw: d });
      }

      if (action === "create-instance") {
        const r = await fetch("https://api.uazapi.com/instance/create", {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ session: sessionId, sessionKey: sessionId }),
        });
        const d = await r.json();
        return json({ success: r.ok, raw: d });
      }
    }

    // ─── Evolution API ───
    if (provedor === "evolution") {
      if (!serverUrl) return json({ error: "server_url não configurada", success: false });

      if (action === "qr-code" || action === "create-instance") {
        // Create + get QR in one step
        const r = await fetch(`${serverUrl}/instance/connect/${sessionId}`, {
          headers: { apikey: token },
        });
        if (!r.ok) {
          // Try creating first
          const cr = await fetch(`${serverUrl}/instance/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: token },
            body: JSON.stringify({ instanceName: sessionId, qrcode: true }),
          });
          const cd = await cr.json();
          return json({ qr_base64: cd.qrcode?.base64 || cd.base64 || null, raw: cd });
        }
        const d = await r.json();
        return json({ qr_base64: d.base64 || d.qrcode?.base64 || null, raw: d });
      }

      if (action === "status") {
        const r = await fetch(`${serverUrl}/instance/connectionState/${sessionId}`, {
          headers: { apikey: token },
        });
        if (!r.ok) return json({ error: `Evolution status error ${r.status}`, success: false });
        const d = await r.json();
        const connected = d.instance?.state === "open" || d.state === "open";
        if (connected) {
          await supabase.from("whatsapp_instances").update({
            status: "connected",
            ultimo_ping: new Date().toISOString(),
          }).eq("id", instance_id);
        }
        return json({ connected, raw: d });
      }

      if (action === "send-text") {
        const { phone, message } = body as { phone: string; message: string };
        const r = await fetch(`${serverUrl}/message/sendText/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: token },
          body: JSON.stringify({ number: phone, text: message }),
        });
        const d = await r.json();
        if (!r.ok) return json({ error: `Evolution send error`, raw: d, success: false });
        return json({ success: true, raw: d });
      }
    }

    return json({ error: `Ação '${action}' não suportada para provedor '${provedor}'`, success: false });
  } catch (err) {
    console.error("whatsapp-proxy error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error", success: false });
  }
});
