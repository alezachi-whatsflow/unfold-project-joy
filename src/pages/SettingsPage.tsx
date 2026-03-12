import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { toast } from "sonner";
import { Settings, Webhook, RefreshCw, Shield, Loader2, CheckCircle, XCircle, PanelLeft, Paintbrush, LayoutGrid, Columns2, Search, Palette } from "lucide-react";
import { TenantManagementCard } from "@/components/settings/TenantManagementCard";
import { CustomLayoutPanel } from "@/components/settings/CustomLayoutPanel";
import { SalesFunnelConfigCard } from "@/components/settings/SalesFunnelConfigCard";
import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";
import type { SidebarLayout, SidebarDensity, SidebarWidth } from "@/types/sidebar";

const LAYOUT_OPTIONS: { value: SidebarLayout; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'grouped_cards', label: 'Grouped Cards', desc: 'Grupos como cards visuais — padrão', icon: <LayoutGrid className="h-5 w-5" /> },
  { value: 'dual_rail', label: 'Dual Rail', desc: 'Rail de ícones + painel contextual', icon: <Columns2 className="h-5 w-5" /> },
  { value: 'spotlight', label: 'Spotlight', desc: 'Busca ⌘K + acordeão + ações rápidas', icon: <Search className="h-5 w-5" /> },
  { value: 'custom', label: 'Personalizado', desc: 'Você decide tudo', icon: <Palette className="h-5 w-5" /> },
];

function SidebarAppearanceCard() {
  const { prefs, setPrefs, resetPrefs } = useSidebarPrefs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Paintbrush className="h-5 w-5" /> Aparência do Menu</CardTitle>
        <CardDescription>Personalize o layout, densidade e comportamento da barra lateral</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Layout Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Layout do Menu</Label>
          <p className="text-xs text-muted-foreground">A mudança é aplicada imediatamente.</p>
          <div className="grid grid-cols-2 gap-3">
            {LAYOUT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-all ${prefs.layout === opt.value ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(74,222,128,0.15)]" : "border-border hover:border-muted-foreground/30"}`}
              >
                <input type="radio" name="layout" value={opt.value} checked={prefs.layout === opt.value} onChange={() => setPrefs({ layout: opt.value })} className="sr-only" />
                <div className={`p-2 rounded-lg ${prefs.layout === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                  {opt.icon}
                </div>
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground text-center">{opt.desc}</span>
                {prefs.layout === opt.value && <span className="text-[10px] text-primary font-bold">✓ Ativo</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Custom Layout Panel */}
        {prefs.layout === 'custom' && (
          <CustomLayoutPanel />
        )}

        {/* Density */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Densidade</Label>
          <RadioGroup value={prefs.density} onValueChange={(v) => setPrefs({ density: v as SidebarDensity })} className="grid grid-cols-3 gap-3">
            {([
              { value: "comfortable", label: "Confortável", desc: "Mais espaço" },
              { value: "default", label: "Padrão", desc: "Equilíbrio" },
              { value: "compact", label: "Compacto", desc: "Menos espaço" },
            ] as const).map((opt) => (
              <label key={opt.value} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors ${prefs.density === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value={opt.value} className="sr-only" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Width */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Largura do Menu</Label>
          <RadioGroup value={prefs.width} onValueChange={(v) => setPrefs({ width: v as SidebarWidth })} className="grid grid-cols-3 gap-3">
            {([
              { value: "narrow", label: "Estreito", desc: "220px" },
              { value: "default", label: "Padrão", desc: "248px" },
              { value: "wide", label: "Largo", desc: "280px" },
            ] as const).map((opt) => (
              <label key={opt.value} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors ${prefs.width === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value={opt.value} className="sr-only" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Behavior toggles */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Comportamento</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Mostrar labels de seção</p><p className="text-xs text-muted-foreground">Exibir títulos como PRINCIPAL, FINANCEIRO</p></div>
              <Switch checked={prefs.showLabels} onCheckedChange={(v) => setPrefs({ showLabels: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Ações rápidas (Spotlight)</p><p className="text-xs text-muted-foreground">Chips de ação no modo Spotlight</p></div>
              <Switch checked={prefs.showQuickActions} onCheckedChange={(v) => setPrefs({ showQuickActions: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Atalhos de teclado</p><p className="text-xs text-muted-foreground">G+D, G+V, ⌘K e outros</p></div>
              <Switch checked={prefs.keyboardShortcuts} onCheckedChange={(v) => setPrefs({ keyboardShortcuts: v })} />
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => { if (confirm("Restaurar todas as preferências da sidebar para o padrão?")) { resetPrefs(); toast.success("Preferências restauradas!"); } }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Restaurar padrões
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { environment, setEnvironment, isSyncing, syncAll } = useAsaas();
  const [registering, setRegistering] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [apiStatus, setApiStatus] = useState<"idle" | "ok" | "error">("idle");
  const [testing, setTesting] = useState(false);

  const webhookUrl = `https://knnwgijcrpbgqhdzmdrp.supabase.co/functions/v1/asaas-webhook`;

  const testConnection = async () => {
    setTesting(true);
    try {
      await callAsaasProxy({ endpoint: "/customers", method: "GET", environment, limit: 1 });
      setApiStatus("ok");
      toast.success("Conexão com Asaas OK!");
    } catch {
      setApiStatus("error");
      toast.error("Falha na conexão com Asaas. Verifique a API Key.");
    } finally {
      setTesting(false);
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await callAsaasProxy({ endpoint: "/webhooks", method: "GET", environment });
      if (res && Array.isArray(res.data)) setWebhooks(res.data);
      else setWebhooks([]);
    } catch { setWebhooks([]); }
    finally { setLoadingWebhooks(false); }
  };

  const registerWebhook = async () => {
    setRegistering(true);
    try {
      await callAsaasProxy({
        endpoint: "/webhooks", method: "POST", environment,
        params: { url: webhookUrl, email: "admin@whatsflow.com", enabled: true, interrupted: false, apiVersion: 3, authToken: "whatsflow-webhook-token", sendType: "SEQUENTIALLY" },
      });
      toast.success("Webhook registrado no Asaas!");
      loadWebhooks();
    } catch (err: any) { toast.error("Erro ao registrar webhook: " + (err.message || "")); }
    finally { setRegistering(false); }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => { try { await loadWebhooks(); } catch {} };
    run();
    return () => { cancelled = true; };
  }, [environment]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações do Asaas, empresas e integrações</p>
      </div>

      <SidebarAppearanceCard />
      <TenantManagementCard />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" /> Ambiente Asaas</CardTitle>
            <CardDescription>Selecione Sandbox para testes ou Production para cobranças reais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ambiente ativo</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">🧪 Sandbox (testes)</SelectItem>
                  <SelectItem value="production">🚀 Production (real)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Testar Conexão
              </Button>
              {apiStatus === "ok" && <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" /> Conectado</Badge>}
              {apiStatus === "error" && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Falhou</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><RefreshCw className="h-5 w-5" /> Sincronização</CardTitle>
            <CardDescription>Sincronize clientes e cobranças do Asaas para o banco local</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={syncAll} disabled={isSyncing} className="w-full">
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar Tudo
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Webhook className="h-5 w-5" /> Webhooks</CardTitle>
            <CardDescription>Gerencie webhooks para receber eventos do Asaas em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
              <p className="mt-1 font-mono text-sm text-foreground break-all">{webhookUrl}</p>
            </div>
            <Button onClick={registerWebhook} disabled={registering}>
              {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}
              Registrar Webhook no Asaas
            </Button>
            {webhooks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Webhooks registrados:</Label>
                {webhooks.map((wh: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded border border-border p-2 text-xs">
                    <Badge variant={wh.enabled ? "default" : "secondary"}>{wh.enabled ? "Ativo" : "Inativo"}</Badge>
                    <span className="font-mono text-muted-foreground truncate">{wh.url}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
