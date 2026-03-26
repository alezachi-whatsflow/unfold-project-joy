import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Instagram, Wifi, Plus, RefreshCw } from "lucide-react";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import MetaChannelsTab from "@/components/integracoes/MetaChannelsTab";

const IntegracoesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedSection, setExpandedSection] = useState<string | null>("uazapi");

  // Handle OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      toast.success(success.includes("instagram") ? "Instagram conectado!" : "WhatsApp conectado!");
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
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageSquare size={20} color="#FFF" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>WhatsApp Web (uazapi)</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Conecte via QR Code — instâncias gerenciadas automaticamente</p>
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
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #0088FF, #00C6FF)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wifi size={20} color="#FFF" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>WhatsApp API Cloud + Instagram</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Meta Business Platform — API oficial com templates HSM</p>
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
