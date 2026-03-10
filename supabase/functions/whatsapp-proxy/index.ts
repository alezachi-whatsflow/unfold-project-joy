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
    if (provedor === "uazapi") {
      const base = serverUrl || "https://api.uazapi.com";

      if (action === "qr-code" || action === "create-instance") {
        // Step 1: Connect session (POST /session/connect) to initiate QR
        const connectR = await fetch(`${base}/session/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Token: token },
          body: JSON.stringify({ Subscribe: ["Message"], Immediate: true }),
        });
        const connectText = await connectR.text();
        console.log("uazapi session/connect:", connectR.status, connectText.substring(0, 500));

        // Step 2: Get QR code (GET /session/qr)
        const qrR = await fetch(`${base}/session/qr`, {
          method: "GET",
          headers: { Token: token },
        });
        const qrText = await qrR.text();
        console.log("uazapi session/qr:", qrR.status, qrText.substring(0, 500));

        if (!qrR.ok) {
          return json({ 
            error: `uazapi QR error ${qrR.status}: ${qrText.substring(0, 300)}`,
            connectResult: connectText.substring(0, 300),
            success: false 
          });
        }

        try {
          const d = JSON.parse(rawText);
          // Extract QR code from response
          const qr = d.qrcode || d.qr || d.base64 || d.data?.qrcode || d.data?.qr || null;
          const state = d.state || d.status || d.data?.state || "";
          
          if (state === "connected" || state === "open") {
            await supabase.from("whatsapp_instances").update({
              status: "connected",
              ultimo_ping: new Date().toISOString(),
              numero: d.phone || d.number || d.data?.phone || inst.numero,
            }).eq("id", instance_id);
            return json({ connected: true, raw: d });
          }

          if (qr) {
            const qrBase64 = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
            return json({ qr_base64: qrBase64, raw: d });
          }

          // If no QR yet, try /v1/instance/qr endpoint
          const qrR = await fetch(`${base}/v1/instance/qr`, {
            method: "GET",
            headers: { ...authHeaders },
          });
          const qrText = await qrR.text();
          console.log("uazapi /v1/instance/qr response:", qrR.status, qrText.substring(0, 500));

          if (qrR.ok) {
            const contentType = qrR.headers.get("content-type") || "";
            if (contentType.startsWith("image/")) {
              // Binary image response
              const encoder = new TextEncoder();
              const bytes = encoder.encode(qrText);
              const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
              return json({ qr_base64: `data:image/png;base64,${b64}` });
            }
            try {
              const qrData = JSON.parse(qrText);
              const qrCode = qrData.qrcode || qrData.qr || qrData.base64 || qrData.data?.qrcode || null;
              if (qrCode) {
                return json({ qr_base64: qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}` });
              }
              return json({ qr_base64: null, raw: qrData });
            } catch {
              if (qrText.length > 100) {
                return json({ qr_base64: `data:image/png;base64,${qrText.trim()}` });
              }
            }
          }

          return json({ qr_base64: null, raw: d, message: "QR não disponível ainda. Tente novamente em alguns segundos." });
        } catch {
          return json({ error: `Resposta inesperada: ${rawText.substring(0, 200)}`, success: false });
        }
      }

      if (action === "status") {
        const r = await fetch(`${base}/session/status`, {
          method: "GET",
          headers: { Token: token },
        });
        if (!r.ok) return json({ error: `uazapi status error ${r.status}`, success: false });
        const d = await r.json();
        const connected = d.data?.Connected === true || d.data?.LoggedIn === true;
        if (connected) {
          await supabase.from("whatsapp_instances").update({
            status: "connected",
            ultimo_ping: new Date().toISOString(),
            numero: d.data?.Jid?.split("@")?.[0] || inst.numero,
          }).eq("id", instance_id);
        }
        return json({ connected, raw: d });
      }

      if (action === "send-text") {
        const { phone, message } = body as { phone: string; message: string };
        const r = await fetch(`${base}/chat/send/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Token: token },
          body: JSON.stringify({ Phone: phone, Body: message }),
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
