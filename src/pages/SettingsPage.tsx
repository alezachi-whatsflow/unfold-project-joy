import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { toast } from "sonner";
import { Settings, Webhook, RefreshCw, Shield, Loader2, CheckCircle, XCircle } from "lucide-react";
import { TenantManagementCard } from "@/components/settings/TenantManagementCard";

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
      setWebhooks(res?.data || []);
    } catch (err) {
      console.error("Erro ao carregar webhooks:", err);
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

  useEffect(() => { loadWebhooks(); }, [environment]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações do Asaas, empresas e integrações</p>
      </div>

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
