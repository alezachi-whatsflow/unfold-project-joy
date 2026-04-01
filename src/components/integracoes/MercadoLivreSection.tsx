import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

interface MercadoLivreSectionProps {
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}

const MercadoLivreSection = ({ expanded, onToggle, onExpand }: MercadoLivreSectionProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mlConnecting, setMlConnecting] = useState(false);
  const [mlStep, setMlStep] = useState<"credentials" | "auth" | "connected">("credentials");
  const [mlForm, setMlForm] = useState({ appId: "", clientSecret: "" });
  const [mlSaving, setMlSaving] = useState(false);
  const [mlIntegration, setMlIntegration] = useState<any>(null);
  const tenantId = useTenantId();

  // Handle OAuth callbacks (ML code)
  useEffect(() => {
    const mlCode = searchParams.get("code");

    if (mlCode && tenantId) {
      setMlConnecting(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      supabase.functions.invoke("ml-oauth-callback", {
        body: { code: mlCode, tenant_id: tenantId, redirect_uri: redirectUri },
      }).then(({ data, error: invokeErr }) => {
        setMlConnecting(false);
        searchParams.delete("code");
        setSearchParams(searchParams, { replace: true });
        if (invokeErr || data?.error) {
          toast.error(`Erro ao conectar ML: ${data?.error || invokeErr?.message}`);
        } else {
          toast.success(`Mercado Livre conectado: ${data?.seller_name || "Vendedor"}`);
          setMlIntegration({ ...mlIntegration, name: data?.seller_name, ml_user_id: data?.ml_user_id, status: "active", credentials: data?.credentials });
          setMlStep("connected");
          onExpand();
        }
      });
    }
  }, [searchParams, setSearchParams, tenantId]);

  // Load existing ML integration
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("channel_integrations")
      .select("id, ml_app_id, ml_user_id, name, status, credentials")
      .eq("tenant_id", tenantId)
      .eq("provider", "MERCADOLIVRE")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMlIntegration(data);
          setMlForm({ appId: data.ml_app_id || "", clientSecret: "" });
          if (data.status === "active" && data.ml_user_id) setMlStep("connected");
          else if (data.ml_app_id) setMlStep("auth");
          else setMlStep("credentials");
        }
      });
  }, [tenantId]);

  // Step 1: Save credentials to DB
  const saveMLCredentials = async () => {
    if (!mlForm.appId.trim() || !mlForm.clientSecret.trim()) {
      toast.error("Preencha App ID e Client Secret"); return;
    }
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setMlSaving(true);
    const { data: existingML } = await supabase.from("channel_integrations")
      .select("id").eq("tenant_id", tenantId).eq("provider", "MERCADOLIVRE").maybeSingle();
    let error: any = null;
    if (existingML) {
      ({ error } = await supabase.from("channel_integrations").update({
        channel_id: `ml_pending_${tenantId}`, name: "Mercado Livre (pendente)",
        ml_app_id: mlForm.appId.trim(), credentials: { client_secret: mlForm.clientSecret.trim() },
        status: "pending", updated_at: new Date().toISOString(),
      }).eq("id", existingML.id));
    } else {
      ({ error } = await supabase.from("channel_integrations").insert({
        tenant_id: tenantId, provider: "MERCADOLIVRE", channel_id: `ml_pending_${tenantId}`,
        name: "Mercado Livre (pendente)", ml_app_id: mlForm.appId.trim(),
        credentials: { client_secret: mlForm.clientSecret.trim() }, status: "pending",
        access_token: "pending",
      }));
    }
    setMlSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Credenciais salvas! Agora autentique sua conta.");
    setMlStep("auth");
  };

  // Step 2: Start OAuth using saved App ID
  const startMLOAuth = () => {
    const appId = mlForm.appId || mlIntegration?.ml_app_id;
    if (!appId) { toast.error("App ID não configurado"); return; }
    const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
    window.location.href = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}`;
  };

  return (
    <Card
      style={{
        border: expanded ? "1px solid rgba(255,230,0,0.5)" : "1px solid var(--border)",
        background: "var(--bg-card)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "16px 20px", border: "none", cursor: "pointer",
          background: expanded ? "rgba(255,230,0,0.06)" : "transparent",
          textAlign: "left",
        }}
      >
        <ChannelIcon channel="mercadolivre" size="lg" variant="icon" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mercado Livre</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Perguntas de pré-venda e mensagens de pedidos</p>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: expanded ? "#FFE600" : "var(--border)",
        }} />
      </button>
      {expanded && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          {mlConnecting ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0" }}>
              <Loader2 size={20} className="animate-spin" style={{ color: "#3483FA" }} />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Conectando ao Mercado Livre...</span>
            </div>

          ) : mlStep === "connected" ? (
            /* Step 3: Connected */
            <div style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(52,131,250,0.08)", border: "1px solid rgba(52,131,250,0.2)" }}>
                <ChannelIcon channel="mercadolivre" size="md" variant="rounded" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{mlIntegration?.name || "Mercado Livre"}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>ID: {mlIntegration?.ml_user_id} · {(mlIntegration?.credentials as any)?.site_id || "MLB"}</p>
                </div>
                <span style={{ fontSize: 10, padding: "3px 8px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>Conectado</span>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Desconectar Mercado Livre? Você perderá o acesso às mensagens e perguntas.")) return;
                  const { error } = await supabase.from("channel_integrations").delete().eq("id", mlIntegration?.id);
                  if (error) { toast.error(error.message); return; }
                  setMlIntegration(null);
                  setMlStep("credentials");
                  setMlForm({ appId: "", clientSecret: "" });
                  toast.success("Mercado Livre desconectado.");
                }}
                style={{
                  marginTop: 12, padding: "8px 16px", border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-muted)", fontSize: 12,
                  cursor: "pointer", width: "100%",
                }}
              >
                Desconectar
              </button>
            </div>

          ) : mlStep === "auth" ? (
            /* Step 2: Credentials saved, authorize account */
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                ✅ Credenciais salvas (App ID: {mlForm.appId || mlIntegration?.ml_app_id})
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Agora autorize sua conta no Mercado Livre para ativar a integração.
              </p>
              <button onClick={startMLOAuth} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#FFE600", color: "#2D3277", fontSize: 13, fontWeight: 600,
              }}>
                <ChannelIcon channel="mercadolivre" size="sm" variant="rounded" />
                Autenticar Conta do Mercado Livre
              </button>
              <button onClick={() => setMlStep("credentials")} style={{
                display: "block", margin: "12px auto 0", background: "none", border: "none",
                fontSize: 11, color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline",
              }}>
                Alterar credenciais
              </button>
            </div>

          ) : (
            /* Step 1: Enter credentials */
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, textAlign: "center" }}>
                Insira as credenciais do seu aplicativo do Mercado Livre. Você encontra em{" "}
                <a href="https://developers.mercadolivre.com.br/detalhe_aplicacao" target="_blank" rel="noopener" style={{ color: "#3483FA", textDecoration: "underline" }}>
                  developers.mercadolivre.com.br
                </a>
              </p>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>App ID (Client ID)</label>
                <input
                  value={mlForm.appId}
                  onChange={(e) => setMlForm({ ...mlForm, appId: e.target.value })}
                  placeholder="Ex: 1234567890123456"
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                    border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))",
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Client Secret (Chave Secreta)</label>
                <input
                  type="password"
                  value={mlForm.clientSecret}
                  onChange={(e) => setMlForm({ ...mlForm, clientSecret: e.target.value })}
                  placeholder="Ex: aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                    border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))",
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, background: "rgba(52,131,250,0.06)", border: "1px solid rgba(52,131,250,0.15)" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#3483FA", margin: "0 0 4px" }}>URL de Redirecionamento (cole no painel do ML):</p>
                <code style={{ fontSize: 10, color: "var(--text-secondary)", wordBreak: "break-all" }}>
                  {window.location.origin}{window.location.pathname}
                </code>
              </div>

              <button
                onClick={saveMLCredentials}
                disabled={mlSaving || !mlForm.appId || !mlForm.clientSecret}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: (!mlForm.appId || !mlForm.clientSecret) ? "var(--border)" : "#FFE600",
                  color: (!mlForm.appId || !mlForm.clientSecret) ? "var(--text-muted)" : "#2D3277",
                  fontSize: 13, fontWeight: 600,
                  opacity: mlSaving ? 0.6 : 1,
                }}
              >
                {mlSaving && <Loader2 size={14} className="animate-spin" />}
                Salvar Credenciais
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default MercadoLivreSection;
