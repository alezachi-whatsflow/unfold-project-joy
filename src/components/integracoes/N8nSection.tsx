import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

interface N8nSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

const N8nSection = ({ expanded, onToggle }: N8nSectionProps) => {
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nApiKey, setN8nApiKey] = useState("");
  const [n8nSaving, setN8nSaving] = useState(false);
  const [n8nIntegration, setN8nIntegration] = useState<any>(null);
  const [n8nCopied, setN8nCopied] = useState<string | null>(null);
  const tenantId = useTenantId();

  // Load n8n integration
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("channel_integrations")
      .select("id, access_token, webhook_url, status")
      .eq("tenant_id", tenantId)
      .eq("provider", "N8N")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setN8nIntegration(data);
          setN8nApiKey(data.access_token || "");
          setN8nWebhookUrl(data.webhook_url || "");
        }
      });
  }, [tenantId]);

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "wf_n8n_";
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const saveN8nIntegration = async () => {
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setN8nSaving(true);
    try {
      const apiKey = n8nApiKey || generateApiKey();
      const { data: existing } = await supabase.from("channel_integrations")
        .select("id").eq("tenant_id", tenantId).eq("provider", "N8N").maybeSingle();

      if (existing) {
        const { error } = await supabase.from("channel_integrations")
          .update({ webhook_url: n8nWebhookUrl.trim(), access_token: apiKey, status: "active", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("channel_integrations").insert({
          tenant_id: tenantId, provider: "N8N", channel_id: `n8n_${tenantId}`,
          name: "n8n Automation", access_token: apiKey, webhook_url: n8nWebhookUrl.trim(), status: "active",
        });
        if (error) throw error;
      }
      setN8nApiKey(apiKey);
      setN8nIntegration({ access_token: apiKey, webhook_url: n8nWebhookUrl.trim(), status: "active" });
      toast.success("Integração n8n salva!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setN8nSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setN8nCopied(label);
    setTimeout(() => setN8nCopied(null), 2000);
  };

  return (
    <Card style={{ border: expanded ? "1px solid rgba(255,106,0,0.4)" : "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 20px", border: "none", cursor: "pointer", background: expanded ? "rgba(255,106,0,0.04)" : "transparent", textAlign: "left" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FF6A00", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#FFF", fontWeight: 800, fontSize: 14 }}>n8n</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>n8n — Automações</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte workflows n8n para automação bidirecional</p>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: n8nIntegration?.status === "active" ? "#10b981" : expanded ? "#FF6A00" : "var(--border)" }} />
      </button>
      {expanded && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>

          {/* API Key */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Sua API Key (use no n8n como Bearer Token)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={n8nApiKey} readOnly placeholder="Clique em Gerar para criar sua chave" style={{ flex: 1, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }} />
              {!n8nApiKey ? (
                <button onClick={() => setN8nApiKey(generateApiKey())} style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "#FF6A00", color: "#FFF", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Gerar</button>
              ) : (
                <button onClick={() => copyToClipboard(n8nApiKey, "apikey")} style={{ padding: "8px 12px", border: "1px solid var(--border)", background: n8nCopied === "apikey" ? "#10b981" : "transparent", color: n8nCopied === "apikey" ? "#FFF" : "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {n8nCopied === "apikey" ? "Copiado!" : "Copiar"}
                </button>
              )}
            </div>
          </div>

          {/* Webhook URL */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>URL do Webhook n8n (receberá as mensagens)</label>
            <input value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} placeholder="https://seu-n8n.com/webhook/abc123" style={{ width: "100%", padding: "8px 12px", fontSize: 12, border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }} />
          </div>

          {/* Save */}
          <button onClick={saveN8nIntegration} disabled={n8nSaving || (!n8nApiKey && !n8nWebhookUrl)} style={{ width: "100%", padding: "10px", border: "none", background: "#FF6A00", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: n8nSaving ? 0.6 : 1 }}>
            {n8nSaving ? "Salvando..." : n8nIntegration ? "Atualizar Integração" : "Ativar Integração"}
          </button>

          {n8nIntegration?.status === "active" && (
            <button onClick={async () => {
              if (!confirm("Desconectar n8n? Os workflows deixarão de receber mensagens.")) return;
              await supabase.from("channel_integrations").delete().eq("id", n8nIntegration.id);
              setN8nIntegration(null); setN8nApiKey(""); setN8nWebhookUrl("");
              toast.success("n8n desconectado.");
            }} style={{ width: "100%", marginTop: 8, padding: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
              Desconectar
            </button>
          )}

          {/* Documentation Express */}
          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>Documentação Expressa</p>

            {/* Snippet 1: Payload recebido pelo n8n */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>1. Payload enviado ao seu Webhook (o que o n8n recebe):</p>
              <div style={{ position: "relative" }}>
                <pre style={{ background: "#1a1a1a", color: "#e0e0e0", padding: 14, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", overflow: "auto", margin: 0, lineHeight: 1.5 }}>{`{
  "contact_phone": "5511999998888",
  "text": "Olá, preciso de ajuda",
  "session_id": "5511999998888@s.whatsapp.net",
  "channel": "whatsapp_web",
  "instance_name": "MinhaInstancia",
  "sender_name": "João Silva",
  "timestamp": "2026-03-27T14:00:00Z",
  "type": "text",
  "media_url": null
}`}</pre>
                <button onClick={() => copyToClipboard(`{
  "contact_phone": "5511999998888",
  "text": "Olá, preciso de ajuda",
  "session_id": "5511999998888@s.whatsapp.net",
  "channel": "whatsapp_web",
  "instance_name": "MinhaInstancia",
  "sender_name": "João Silva",
  "timestamp": "2026-03-27T14:00:00Z",
  "type": "text",
  "media_url": null
}`, "payload")} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", border: "none", background: n8nCopied === "payload" ? "#10b981" : "#333", color: "#FFF", fontSize: 10, cursor: "pointer" }}>
                  {n8nCopied === "payload" ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
                No n8n, use: <code style={{ background: "var(--bg-muted)", padding: "1px 4px", fontSize: 10 }}>{"{{ $json.body.text }}"}</code> para acessar o texto da mensagem.
              </p>
            </div>

            {/* Snippet 2: Node HTTP Request para responder */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 6px" }}>2. Responder o cliente (Node HTTP Request no n8n):</p>
              <div style={{ position: "relative" }}>
                <pre style={{ background: "#1a1a1a", color: "#e0e0e0", padding: 14, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", overflow: "auto", margin: 0, lineHeight: 1.5 }}>{`// Configure um nó "HTTP Request" no n8n:
// Método: POST
// URL: ${import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br"}/functions/v1/api-n8n-inbound

// Headers:
//   Authorization: Bearer ${n8nApiKey || "<SUA_API_KEY>"}
//   Content-Type: application/json

// Body (JSON):
{
  "phone": "={{ $json.body.contact_phone }}",
  "text": "Sua resposta automática aqui"
}`}</pre>
                <button onClick={() => copyToClipboard(JSON.stringify({
                  parameters: {
                    method: "POST",
                    url: `${import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br"}/functions/v1/api-n8n-inbound`,
                    authentication: "genericCredentialType",
                    genericAuthType: "httpHeaderAuth",
                    sendHeaders: true,
                    headerParameters: { parameters: [{ name: "Authorization", value: `Bearer ${n8nApiKey || "<SUA_API_KEY>"}` }] },
                    sendBody: true,
                    bodyParameters: { parameters: [
                      { name: "phone", value: "={{ $json.body.contact_phone }}" },
                      { name: "text", value: "Sua resposta automática aqui" },
                    ] },
                  },
                  type: "n8n-nodes-base.httpRequest",
                  typeVersion: 4.2,
                  position: [800, 300],
                  name: "Responder Whatsflow",
                }, null, 2), "node")} style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", border: "none", background: n8nCopied === "node" ? "#10b981" : "#333", color: "#FFF", fontSize: 10, cursor: "pointer" }}>
                  {n8nCopied === "node" ? "Copiado!" : "Copiar Node JSON"}
                </button>
              </div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
                Cole o JSON copiado no n8n: Ctrl+V no canvas para importar o nó configurado.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default N8nSection;
