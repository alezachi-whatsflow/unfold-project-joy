import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle, CreditCard, RefreshCw, Settings, Wifi, WifiOff } from "lucide-react";
import { CheckoutIntegrationsCard } from "@/components/settings/CheckoutIntegrationsCard";
import { AsaasSetupModal } from "@/components/settings/AsaasSetupModal";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Label } from "@/components/ui/label";

interface AsaasConnectionSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

const AsaasConnectionSection = ({ expanded, onToggle }: AsaasConnectionSectionProps) => {
  const tenantId = useTenantId();
  const { environment, isSyncing, syncAll } = useAsaas();
  const [setupOpen, setSetupOpen] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    is_active: boolean;
    environment: string;
    wallet_id: string | null;
    account_status: string;
    api_key_hint: string;
  } | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [togglingSync, setTogglingSync] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  // Load connection info
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("asaas_connections")
        .select("is_active, environment, wallet_id, account_status, api_key_hint")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        setConnectionInfo(data);
        setSyncEnabled(data.is_active ?? true);
      }
    })();
  }, [tenantId]);

  const isConnected = !!connectionInfo?.is_active;

  const handleToggleSync = async (enabled: boolean) => {
    if (!tenantId) return;
    setSyncEnabled(enabled);
    setTogglingSync(true);
    const { error } = await (supabase as any)
      .from("asaas_connections")
      .update({ is_active: enabled, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);
    if (error) {
      setSyncEnabled(!enabled);
      toast.error("Erro ao salvar");
    }
    setTogglingSync(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestOk(null);
    try {
      await callAsaasProxy({ endpoint: "/customers", method: "GET", environment, limit: 1 });
      setTestOk(true);
      toast.success("Conexão OK!");
    } catch {
      setTestOk(false);
      toast.error("Falha na conexão");
    } finally {
      setTesting(false);
    }
  };

  const reloadInfo = () => {
    if (!tenantId) return;
    (supabase as any).from("asaas_connections")
      .select("is_active, environment, wallet_id, account_status, api_key_hint")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setConnectionInfo(data); });
  };

  return (
    <Card
      style={{
        border: expanded ? "1px solid rgba(0,166,81,0.4)" : "1px solid var(--border)",
        background: "var(--bg-card)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "16px 20px", border: "none", cursor: "pointer",
          background: expanded ? "rgba(0,166,81,0.06)" : "transparent",
          textAlign: "left",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#00A651", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={20} color="#FFF" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Pagamentos & Checkout</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>PIX, Boleto, Cartão de Crédito, Webhooks e Links de Checkout</p>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isConnected ? "#00A651" : "var(--border)" }} />
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>

          {/* ── Resumo / Status ── */}
          {!isConnected ? (
            /* Desconectado: apenas resumo informativo, sem botão */
            <div className="mt-4 mb-4 p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-semibold mb-1">Resumo Checkout's</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure gateways de pagamento para gerar cobranças via PIX, Boleto Bancário e Cartão de Crédito.
                Conecte o Asaas, Stripe, Mercado Pago ou outro gateway na seção abaixo para começar a receber pagamentos diretamente pela plataforma.
              </p>
            </div>
          ) : (
            /* Conectado: card de status compacto */
            <div className="mt-4 mb-4 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00A651]/10 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-[#00A651]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Asaas</span>
                      <Badge className="bg-emerald-600/90 text-[9px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Conectado</Badge>
                    </div>
                    {connectionInfo && (
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{connectionInfo.environment === "production" ? "🔵 Produção" : "🟡 Sandbox"}</span>
                        {connectionInfo.wallet_id && <span>Wallet: {connectionInfo.wallet_id.substring(0, 12)}...</span>}
                        {connectionInfo.api_key_hint && <span>Key: ****{connectionInfo.api_key_hint}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Testar
                  </Button>
                  {testOk === true && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {testOk === false && <XCircle className="h-4 w-4 text-rose-500" />}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSetupOpen(true)}>
                      Reconfigurar
                  </Button>
                </div>
              </div>

              {/* Sync toggle */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-500/10">
                <Label className="text-xs">Sincronizar cobranças automaticamente</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={syncEnabled} onCheckedChange={handleToggleSync} disabled={togglingSync} />
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={syncAll} disabled={isSyncing || !syncEnabled}>
                    {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Sincronizar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Integrations */}
          <CheckoutIntegrationsCard />
        </div>
      )}

      {/* Smart Setup Modal */}
      <AsaasSetupModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onConnected={() => { reloadInfo(); toast.success("Asaas conectado!"); }}
      />
    </Card>
  );
};

export default AsaasConnectionSection;
