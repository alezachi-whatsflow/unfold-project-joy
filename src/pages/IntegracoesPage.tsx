import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { MetaBusinessPartnerBadge } from "@/components/ui/MetaBusinessPartnerBadge";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import MetaChannelsTab from "@/components/integracoes/MetaChannelsTab";
import TelegramSection from "@/components/integracoes/TelegramSection";
import MercadoLivreSection from "@/components/integracoes/MercadoLivreSection";
import N8nSection from "@/components/integracoes/N8nSection";
import AsaasConnectionSection from "@/components/integracoes/AsaasConnectionSection";
import { IazisModule } from "@/modules/iazis";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const CATEGORIES = [
  { id: 'canais', label: 'Canais de Atendimento' },
  { id: 'financeiro', label: 'Financeiro & Gateways' },
  { id: 'automacao', label: 'Automação' },
] as const;

const IntegracoesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [expandedSection, setExpandedSection] = useState<string | null>("uazapi");
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('canais');
  const tenantId = useTenantId();

  // Check if tenant has pzaafi_tier for Checkout card
  const { user } = useAuth();
  const { data: pzaafiTier } = useQuery({
    queryKey: ["pzaafi-tier-integracoes", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: ut } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!ut?.tenant_id) return null;
      const { data: license } = await supabase
        .from("licenses")
        .select("pzaafi_tier")
        .eq("tenant_id", ut.tenant_id)
        .maybeSingle();
      return license?.pzaafi_tier || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  // Handle OAuth callbacks (Meta + ML success/error params)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

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
  }, [searchParams, setSearchParams]);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Integracoes</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Gerencie todas as suas conexoes em um so lugar.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={() => navigate(`/app/${slug || "whatsflow"}/vendas`)}
        >
          Continuar configuracao →
        </Button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid hsl(var(--border))" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeCategory === cat.id ? "hsl(var(--primary)/0.1)" : "transparent",
              color: activeCategory === cat.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              borderBottom: activeCategory === cat.id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (activeCategory !== cat.id) {
                (e.target as HTMLElement).style.color = "hsl(var(--foreground))";
              }
            }}
            onMouseLeave={(e) => {
              if (activeCategory !== cat.id) {
                (e.target as HTMLElement).style.color = "hsl(var(--muted-foreground))";
              }
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ---- CANAIS DE ATENDIMENTO ---- */}
        {activeCategory === 'canais' && <>

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
        <MercadoLivreSection
          expanded={expandedSection === "ml"}
          onToggle={() => toggleSection("ml")}
          onExpand={() => setExpandedSection("ml")}
        />

        {/* Telegram */}
        <TelegramSection
          expanded={expandedSection === "telegram"}
          onToggle={() => toggleSection("telegram")}
        />

        {/* Webchat Nativo */}
        <Card
          style={{
            border: expandedSection === "webchat" ? "1px solid rgba(17,188,118,0.4)" : "1px solid var(--border)",
            background: "#FFFFFF", borderRadius: 0, overflow: "hidden", boxShadow: "none",
          }}
        >
          <button
            onClick={() => toggleSection("webchat")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "webchat" ? "rgba(17,188,118,0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <ChannelIcon channel="webchat" size="lg" variant="icon" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#000", margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>Webchat Nativo</p>
              <p style={{ fontSize: 11, color: "#666", margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>Injete a infraestrutura Pzaafi diretamente no seu website.</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: expandedSection === "webchat" ? "#11bc76" : "var(--border)" }} />
          </button>
          {expandedSection === "webchat" && (
            <div style={{ padding: "20px", borderTop: "1px solid #E8E5DF" }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 340px", minWidth: 300 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#999", margin: "0 0 8px", fontFamily: "Inter, system-ui, sans-serif" }}>Simulador</p>
                  <div style={{ background: "#EDEDED", border: "1px solid #D0D0D0", borderRadius: 0, padding: 0, position: "relative", overflow: "hidden", height: 320, boxShadow: "none" }}>
                    <div style={{ background: "#E0E0E0", height: 28, display: "flex", alignItems: "center", padding: "0 10px", gap: 6, borderBottom: "1px solid #D0D0D0" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CCC" }} />
                      <div style={{ flex: 1, marginLeft: 8, height: 14, background: "#FFF", borderRadius: 0, border: "1px solid #D0D0D0", display: "flex", alignItems: "center", padding: "0 8px" }}>
                        <span style={{ fontSize: 8, color: "#999", fontFamily: "monospace" }}>seusite.com.br</span>
                      </div>
                    </div>
                    <div style={{ padding: "24px 20px", position: "relative", height: "calc(100% - 28px)" }}>
                      <p style={{ fontSize: 28, fontWeight: 900, color: "#000", margin: "0 0 8px", fontFamily: "Inter, system-ui, sans-serif", letterSpacing: -1, lineHeight: 1 }}>PZAAFI</p>
                      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#999", margin: "0 0 20px", fontFamily: "Inter, system-ui, sans-serif" }}>THE PRIMORDIAL VOID</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ width: "90%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "75%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "82%", height: 6, background: "#DDD" }} />
                        <div style={{ width: "60%", height: 6, background: "#DDD" }} />
                      </div>
                      <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ width: 180, background: "#FFF", border: "1px solid #000", borderRadius: 0, boxShadow: "none", overflow: "hidden" }}>
                          <div style={{ background: "#000", color: "#FFF", padding: "6px 10px", fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter, system-ui, sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>CONEXÃO ATIVA</span>
                            <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.6 }}>✕</span>
                          </div>
                          <div style={{ padding: "8px", background: "#FAFAFA", minHeight: 60 }}>
                            <div style={{ background: "#E8E8E8", padding: "4px 8px", fontSize: 8, fontFamily: "Inter, system-ui, sans-serif", color: "#333", display: "inline-block", maxWidth: "85%" }}>Olá! Como posso ajudar?</div>
                          </div>
                          <div style={{ display: "flex", borderTop: "1px solid #000" }}>
                            <div style={{ flex: 1, padding: "5px 8px", fontSize: 8, color: "#999", fontFamily: "Inter, system-ui, sans-serif" }}>Digite sua mensagem...</div>
                            <div style={{ background: "#000", color: "#FFF", padding: "5px 8px", fontSize: 7, fontWeight: 700, letterSpacing: 1, fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center" }}>ENVIAR</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#999", margin: "0 0 8px", fontFamily: "Inter, system-ui, sans-serif" }}>Instalação DIY</p>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "Inter, system-ui, sans-serif", minWidth: 16 }}>1.</span>
                      <span style={{ fontSize: 12, color: "#333", fontFamily: "Inter, system-ui, sans-serif" }}>Copie o script abaixo.</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#000", fontFamily: "Inter, system-ui, sans-serif", minWidth: 16 }}>2.</span>
                      <span style={{ fontSize: 12, color: "#333", fontFamily: "Inter, system-ui, sans-serif" }}>
                        Cole antes da tag de fechamento{" "}
                        <code style={{ fontFamily: "monospace", background: "#F0F0F0", padding: "1px 4px", border: "1px solid #E0E0E0", fontSize: 11 }}>&lt;/body&gt;</code>{" "}do seu site.
                      </span>
                    </div>
                  </div>
                  <pre style={{ background: "#000000", color: "#FFFFFF", padding: "16px 20px", fontSize: 12, lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflowX: "auto", border: "none", borderRadius: 0, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", boxShadow: "none" }}>
                    <code>{`<script\n  data-tenant="${tenantId || "SEU_TENANT_ID"}"\n  src="https://cdn.iazis.com/webchat.js"\n></script>`}</code>
                  </pre>
                  <button
                    onClick={() => {
                      const code = `<script data-tenant="${tenantId || "SEU_TENANT_ID"}" src="https://cdn.iazis.com/webchat.js"></script>`;
                      navigator.clipboard.writeText(code).then(() => {
                        setCodeCopied(true);
                        toast.success("Código copiado!");
                        setTimeout(() => setCodeCopied(false), 2000);
                      });
                    }}
                    style={{ display: "block", width: "100%", marginTop: 0, padding: "10px", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer", borderRadius: 0, boxShadow: "none", border: "1px solid #000", borderTop: "none", background: codeCopied ? "#000" : "#FFF", color: codeCopied ? "#FFF" : "#000", transition: "all 0.15s" }}
                  >
                    {codeCopied ? "COPIADO" : "COPIAR CODIGO"}
                  </button>
                  <div style={{ marginTop: 16, padding: 12, background: "#FAFAFA", border: "1px solid #E8E5DF", borderRadius: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#999", margin: "0 0 4px", fontFamily: "Inter, system-ui, sans-serif" }}>Seu Tenant ID</p>
                    <code style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#000", wordBreak: "break-all" }}>
                      {tenantId || "Carregando..."}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        </>}

        {/* ---- FINANCEIRO & GATEWAYS ---- */}
        {activeCategory === 'financeiro' && <>

        {/* Checkout Whatsflow (Pzaafi) */}
        <Card
          style={{
            border: expandedSection === "iazis" ? "1px solid hsl(var(--primary)/0.4)" : "1px solid var(--border)",
            background: "var(--bg-card)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleSection("iazis")}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "16px 20px", border: "none", cursor: "pointer",
              background: expandedSection === "iazis" ? "hsl(var(--primary)/0.06)" : "transparent",
              textAlign: "left",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "hsl(var(--primary)/0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={20} style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Checkout Whatsflow</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Receba pagamentos via PIX, Cartão e Boleto</p>
            </div>
            <span style={{
              fontSize: 10, padding: "3px 10px", fontWeight: 600, borderRadius: 4,
              background: pzaafiTier ? "#10b98120" : "hsl(var(--muted)/0.3)",
              color: pzaafiTier ? "#10b981" : "hsl(var(--muted-foreground))",
            }}>
              {pzaafiTier ? "Ativo" : "Não configurado"}
            </span>
          </button>
          {expandedSection === "iazis" && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
              {pzaafiTier ? (
                <IazisModule />
              ) : (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                    Módulo não habilitado. Entre em contato para ativar.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Asaas (Pagamentos) */}
        <AsaasConnectionSection
          expanded={expandedSection === "asaas"}
          onToggle={() => toggleSection("asaas")}
        />

        </>}

        {/* ---- AUTOMAÇÃO ---- */}
        {activeCategory === 'automacao' && <>

        {/* n8n Automation */}
        <N8nSection
          expanded={expandedSection === "n8n"}
          onToggle={() => toggleSection("n8n")}
        />

        {/* Future */}
        <Card style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, opacity: 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={20} style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mais integrações em breve</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Email, Zapier, Make e mais</p>
            </div>
          </div>
        </Card>

        </>}

      </div>
    </div>
  );
};

export default IntegracoesPage;
