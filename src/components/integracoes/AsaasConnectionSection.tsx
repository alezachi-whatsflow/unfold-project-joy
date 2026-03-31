import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, RefreshCw, Webhook, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { CheckoutIntegrationsCard } from "@/components/settings/CheckoutIntegrationsCard";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

interface AsaasConnectionSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

const AsaasConnectionSection = ({ expanded, onToggle }: AsaasConnectionSectionProps) => {
  const tenantId = useTenantId();
  const { environment, setEnvironment, isSyncing, syncAll } = useAsaas();
  const [testing, setTesting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [togglingSync, setTogglingSync] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br"}/functions/v1/asaas-webhook`;

  // Load sync state from DB (asaas_connections.is_active)
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("asaas_connections")
        .select("is_active")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) setSyncEnabled(data.is_active ?? true);
    })();
  }, [tenantId]);

  const handleToggleSync = async (enabled: boolean) => {
    if (!tenantId) return;
    setSyncEnabled(enabled); // optimistic
    setTogglingSync(true);
    const { error } = await (supabase as any)
      .from("asaas_connections")
      .update({ is_active: enabled, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);
    setTogglingSync(false);
    if (error) {
      setSyncEnabled(!enabled); // revert
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(enabled ? "Sincronizacao Asaas ativada" : "Sincronizacao Asaas desativada");
    }
  };

  const testAsaasConnection = async () => {
    setTesting(true); setApiStatus(null);
    try {
      await callAsaasProxy({ endpoint: "/customers", method: "GET", environment, limit: 1 });
      setApiStatus("ok"); toast.success("Conexão com Asaas OK!");
    } catch {
      setApiStatus("error"); toast.error("Falha na conexão com Asaas.");
    } finally { setTesting(false); }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await callAsaasProxy({ endpoint: "/webhooks", method: "GET", environment });
      setWebhooks(Array.isArray(res?.data) ? res.data : []);
    } catch { setWebhooks([]); }
    finally { setLoadingWebhooks(false); }
  };

  const registerWebhook = async () => {
    setRegistering(true);
    try {
      await callAsaasProxy({
        endpoint: "/webhooks", method: "POST", environment,
        body: { url: webhookUrl, email: "", apiVersion: 3, enabled: true,
          events: ["PAYMENT_RECEIVED","PAYMENT_CONFIRMED","PAYMENT_OVERDUE","PAYMENT_DELETED","PAYMENT_REFUNDED","PAYMENT_CREATED","PAYMENT_UPDATED"],
        },
      });
      toast.success("Webhook registrado!"); loadWebhooks();
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setRegistering(false); }
  };

  useEffect(() => { loadWebhooks(); }, [environment]);

  return (
    <Card
      style={{
        border: expanded ? "1px solid rgba(0,166,81,0.4)" : "1px solid var(--border)",
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
          background: expanded ? "rgba(0,166,81,0.06)" : "transparent",
          textAlign: "left",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#00A651", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={20} color="#FFF" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Asaas — Pagamentos & Checkout</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>PIX, Boleto, Cartão de Crédito, Webhooks e Links de Checkout</p>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: expanded ? "#00A651" : "var(--border)" }} />
      </button>
      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            {/* Ambiente */}
            <Card style={{ border: "1px solid var(--border)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4" /> Ambiente Asaas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">🧪 Sandbox (testes)</SelectItem>
                    <SelectItem value="production">🚀 Production (real)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={testAsaasConnection} disabled={testing} className="text-xs gap-1">
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Testar
                  </Button>
                  {apiStatus === "ok" && <Badge className="bg-green-600 text-[9px]"><CheckCircle className="mr-1 h-3 w-3" /> OK</Badge>}
                  {apiStatus === "error" && <Badge variant="destructive" className="text-[9px]"><XCircle className="mr-1 h-3 w-3" /> Falha</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Sincronização */}
            <Card style={{ border: "1px solid var(--border)" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4" /> Sincronização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Sincronização de cobranças via Asaas</Label>
                  <Switch checked={syncEnabled} onCheckedChange={handleToggleSync} disabled={togglingSync} />
                </div>
                <Button onClick={syncAll} disabled={isSyncing || !syncEnabled} size="sm" className="w-full text-xs gap-1">
                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sincronizar Tudo
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Webhooks */}
          <Card style={{ border: "1px solid var(--border)", marginTop: 16 }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Webhook className="h-4 w-4" /> Webhooks Asaas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border p-2">
                <Label className="text-[10px] text-muted-foreground">URL do Webhook</Label>
                <p className="font-mono text-[10px] text-foreground break-all mt-1">{webhookUrl}</p>
              </div>
              <Button variant="outline" size="sm" onClick={registerWebhook} disabled={registering} className="text-xs gap-1">
                {registering ? <Loader2 className="h-3 w-3 animate-spin" /> : <Webhook className="h-3 w-3" />} Registrar Webhook
              </Button>
              {webhooks.length > 0 && (
                <div className="space-y-1">
                  {webhooks.map((wh: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded border p-1.5 text-[10px]">
                      <Badge variant={wh.enabled ? "default" : "secondary"} className="text-[8px]">{wh.enabled ? "Ativo" : "Off"}</Badge>
                      <span className="font-mono text-muted-foreground truncate">{wh.url}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checkout */}
          <div style={{ marginTop: 16 }}>
            <CheckoutIntegrationsCard />
          </div>
        </div>
      )}
    </Card>
  );
};

export default AsaasConnectionSection;
