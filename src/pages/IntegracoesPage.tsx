import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { MetaBusinessPartnerBadge } from "@/components/ui/MetaBusinessPartnerBadge";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import MetaChannelsTab from "@/components/integracoes/MetaChannelsTab";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const IntegracoesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedSection, setExpandedSection] = useState<string | null>("uazapi");
  const [mlConnecting, setMlConnecting] = useState(false);
  const [mlStep, setMlStep] = useState<"credentials" | "auth" | "connected">("credentials");
  const [mlForm, setMlForm] = useState({ appId: "", clientSecret: "" });
  const [mlSaving, setMlSaving] = useState(false);
  const [mlIntegration, setMlIntegration] = useState<any>(null);
  const tenantId = useTenantId();

  // Handle OAuth callbacks (Meta + ML)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const mlCode = searchParams.get("code");

    if (success) {
      toast.success(
        success.includes("mercadolivre") ? "Mercado Livre conectado!" :
        success.includes("instagram") ? "Instagram conectado!" : "Conectado!"
      );
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
    }
    if (error) {
      toast.error(`Erro: ${decodeURIComponent(error)}`);
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }

    // ML OAuth callback: exchange code for tokens
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
          setExpandedSection("ml");
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
          setMlForm({ appId: data.ml_app_id || "", clientSecret: "" }); // secret not shown
          if (data.status === "active" && data.ml_user_id) setMlStep("connected");
          else if (data.ml_app_id) setMlStep("auth");
          else setMlStep("credentials");
        }
      });
  }, [tenantId]);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Step 1: Save credentials to DB
  const saveMLCredentials = async () => {
    if (!mlForm.appId.trim() || !mlForm.clientSecret.trim()) {
      toast.error("Preencha App ID e Client Secret"); return;
    }
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setMlSaving(true);
    const { error } = await supabase.from("channel_integrations").upsert({
      tenant_id: tenantId,
      provider: "MERCADOLIVRE",
      channel_id: `ml_pending_${tenantId}`,
      name: "Mercado Livre (pendente)",
      ml_app_id: mlForm.appId.trim(),
      credentials: { client_secret: mlForm.clientSecret.trim() },
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "channel_id" });
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
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Integrações</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Gerencie todas as suas conexões em um só lugar.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* WhatsApp Web (uazapi) */}
        <Card
          style={{
            border: expandedSection === "uazapi" ? "1px solid var(--inbox-active-border, rgba(14,138,92,0.25))" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("uazapi")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "uazapi" ? "var(--inbox-active-bg, rgba(14,138,92,0.08))" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="whatsapp_web" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>API WhatsApp Web</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte via QR Code — configuração automática</p>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: expandedSection === "uazapi" ? "#25D366" : "var(--border)",
            }} />
          </button>
          {expandedSection === "uazapi" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <UazapiInstancesTab />
            </div>
          )}
        </Card>

        {/* WhatsApp Cloud API + Instagram (Meta) */}
        <Card
          style={{
            border: expandedSection === "meta" ? "1px solid var(--inbox-active-border, rgba(14,138,92,0.25))" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("meta")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "meta" ? "var(--inbox-active-bg, rgba(14,138,92,0.08))" : "transparent",
              textAlign: "left",
            }}
          >
            <MetaBusinessPartnerBadge size="md" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Contas Cloud API Meta + Instagram + Facebook</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>API oficial com templates HSM</p>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: expandedSection === "meta" ? "#0088FF" : "var(--border)",
            }} />
          </button>
          {expandedSection === "meta" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              <MetaChannelsTab />
            </div>
          )}
        </Card>

        {/* Mercado Livre */}
        <Card
          style={{
            border: expandedSection === "ml" ? "1px solid rgba(255,230,0,0.5)" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("ml")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "ml" ? "rgba(255,230,0,0.06)" : "transparent",
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
              background: expandedSection === "ml" ? "#FFE600" : "var(--border)",
            }} />
          </button>
          {expandedSection === "ml" && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
              {mlConnecting ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 0" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "#3483FA" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Conectando ao Mercado Livre...</span>
                </div>

              ) : mlStep === "connected" ? (
                /* ── Step 3: Connected ── */
                <div style={{ padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, background: "rgba(52,131,250,0.08)", border: "1px solid rgba(52,131,250,0.2)" }}>
                    <ChannelIcon channel="mercadolivre" size="md" variant="rounded" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{mlIntegration?.name || "Mercado Livre"}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>ID: {mlIntegration?.ml_user_id} · Ativo</p>
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "#10b98120", color: "#10b981", fontWeight: 600 }}>Conectado</span>
                  </div>
                </div>

              ) : mlStep === "auth" ? (
                /* ── Step 2: Credentials saved, authorize account ── */
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
                /* ── Step 1: Enter credentials ── */
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

        {/* Future: More integrations */}
        <Card
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            opacity: 0.6,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 20px",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={20} style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mais integrações em breve</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Telegram, Email, Zapier, n8n, Make e mais</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default IntegracoesPage;
