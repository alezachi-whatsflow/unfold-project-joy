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

const ML_APP_ID = import.meta.env.VITE_ML_APP_ID || "";

const IntegracoesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedSection, setExpandedSection] = useState<string | null>("uazapi");
  const [mlConnecting, setMlConnecting] = useState(false);
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

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const startMLOAuth = () => {
    if (!ML_APP_ID) {
      toast.error("VITE_ML_APP_ID não configurado");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
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
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                    Conecte sua conta do Mercado Livre para responder perguntas e mensagens de pedidos diretamente na Caixa de Entrada.
                  </p>
                  <button
                    onClick={startMLOAuth}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "#FFE600", color: "#2D3277", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <ChannelIcon channel="mercadolivre" size="sm" variant="rounded" />
                    Conectar Mercado Livre
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
