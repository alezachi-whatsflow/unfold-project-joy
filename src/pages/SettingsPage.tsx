import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { toast } from "sonner";
import { Settings, Webhook, RefreshCw, Shield, Loader2, CheckCircle, XCircle, PanelLeft } from "lucide-react";
import { TenantManagementCard } from "@/components/settings/TenantManagementCard";
import { useSidebarPrefs, type SidebarLayout, type SidebarDensity } from "@/contexts/SidebarPrefsContext";

function SidebarAppearanceCard() {
  const { prefs, setPrefs } = useSidebarPrefs();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><PanelLeft className="h-5 w-5" /> Aparência do Menu</CardTitle>
        <CardDescription>Personalize o layout e a densidade da barra lateral</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Layout</Label>
          <RadioGroup value={prefs.layout} onValueChange={(v) => setPrefs({ layout: v as SidebarLayout })} className="grid grid-cols-3 gap-3">
            {([
              { value: "standard", label: "Padrão", desc: "Sidebar expandida com toggle" },
              { value: "compact", label: "Compacto", desc: "Expandida com menos espaçamento" },
              { value: "rail", label: "Rail", desc: "Sempre colapsada (64px)" },
            ] as const).map((opt) => (
              <label key={opt.value} className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors ${prefs.layout === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value={opt.value} className="sr-only" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground text-center">{opt.desc}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Densidade</Label>
          <RadioGroup value={prefs.density} onValueChange={(v) => setPrefs({ density: v as SidebarDensity })} className="grid grid-cols-3 gap-3">
            {([
              { value: "comfortable", label: "Confortável", desc: "Mais espaço, fonte 14px" },
              { value: "default", label: "Padrão", desc: "Equilíbrio, fonte 13px" },
              { value: "compact", label: "Compacto", desc: "Menos espaço, fonte 12px" },
            ] as const).map((opt) => (
              <label key={opt.value} className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors ${prefs.density === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value={opt.value} className="sr-only" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground text-center">{opt.desc}</span>
              </label>
            ))}
          </RadioGroup>
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
      if (res && Array.isArray(res.data)) {
        setWebhooks(res.data);
      } else {
        setWebhooks([]);
      }
    } catch (err: any) {
      console.warn("[Settings] Webhooks não carregados (API Key pode estar inválida):", err?.message || err);
      setWebhooks([]);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const registerWebhook = async () => {
    setRegistering(true);
    try {
      await callAsaasProxy({
        endpoint: "/webhooks",
        method: "POST",
        environment,
        params: {
          url: webhookUrl,
          email: "admin@whatsflow.com",
          enabled: true,
          interrupted: false,
          apiVersion: 3,
          authToken: "whatsflow-webhook-token",
          sendType: "SEQUENTIALLY",
        },
      });
      toast.success("Webhook registrado no Asaas!");
      loadWebhooks();
    } catch (err: any) {
      toast.error("Erro ao registrar webhook: " + (err.message || ""));
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadWebhooks();
      } catch (err) {
        if (!cancelled) console.warn("[Settings] Effect loadWebhooks error:", err);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [environment]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações do Asaas, empresas e integrações</p>
      </div>

      {/* Sidebar Appearance */}
      <SidebarAppearanceCard />

      {/* Tenant Management */}
      <TenantManagementCard />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ambiente */}
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
            <p className="text-xs text-muted-foreground">
              A API Key deve estar configurada como secret <code>ASAAS_API_KEY</code> no Lovable Cloud.
            </p>
          </CardContent>
        </Card>

        {/* Sincronização */}
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
            <p className="text-xs text-muted-foreground">
              Busca todos os clientes e cobranças do Asaas e salva no banco de dados local.
            </p>
          </CardContent>
        </Card>

        {/* Webhook */}
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
