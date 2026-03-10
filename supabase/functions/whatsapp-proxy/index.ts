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

    // ─── uazapi v2 ───
    // ─── uazapi v2 ───
    if (provedor === "uazapi") {
      const base = serverUrl || "https://api.uazapi.com";
      const instHeaders: Record<string, string> = { "Content-Type": "application/json", token: token };

      if (action === "qr-code" || action === "create-instance") {
        // POST /instance/connect to initiate connection + QR generation
        const connectR = await fetch(`${base}/instance/connect`, {
          method: "POST",
          headers: instHeaders,
          body: JSON.stringify({}),
        });
        const connectText = await connectR.text();
        console.log("uazapi /instance/connect:", connectR.status, connectText.substring(0, 500));

        try {
          const connectData = JSON.parse(connectText);
          const qr = connectData.qrcode || connectData.qr || connectData.base64 ||
                     connectData.data?.qrcode || connectData.data?.qr || connectData.data?.base64 || null;
          
          const state = connectData.state || connectData.status || connectData.data?.state || "";
          if (state === "connected" || state === "open" || connectData.data?.Connected === true) {
            await supabase.from("whatsapp_instances").update({
              status: "connected",
              ultimo_ping: new Date().toISOString(),
              numero: connectData.phone || connectData.data?.phone || inst.numero,
            }).eq("id", instance_id);
            return json({ connected: true, raw: connectData });
          }

          if (qr) {
            const qrBase64 = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
            return json({ qr_base64: qrBase64, raw: connectData });
          }

          return json({ 
            qr_base64: null, 
            raw: connectData,
            message: "Conexão iniciada. Verifique o token da instância.",
            success: connectR.ok 
          });
        } catch {
          return json({ 
            error: `uazapi connect error ${connectR.status}: ${connectText.substring(0, 300)}`, 
            success: false 
          });
        }
      }

      if (action === "status") {
        const r = await fetch(`${base}/instance/status`, {
          method: "GET",
          headers: { token: token },
        });
        if (!r.ok) return json({ error: `uazapi status error ${r.status}`, success: false });
        const d = await r.json();
        const state = d.state || d.status || d.data?.state || "";
        const connected = state === "connected" || state === "open" || 
                         d.data?.Connected === true || d.data?.LoggedIn === true;
        if (connected) {
          await supabase.from("whatsapp_instances").update({
            status: "connected",
            ultimo_ping: new Date().toISOString(),
            numero: d.data?.Jid?.split("@")?.[0] || d.phone || inst.numero,
          }).eq("id", instance_id);
        }
        return json({ connected, raw: d });
      }

      if (action === "send-text") {
        const { phone, message } = body as { phone: string; message: string };
        const r = await fetch(`${base}/send/text`, {
          method: "POST",
          headers: instHeaders,
          body: JSON.stringify({ number: phone, text: message }),
        });
        const d = await r.json();
        if (!r.ok) return json({ error: `uazapi send error`, raw: d, success: false });
        return json({ success: true, raw: d });
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
