import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck, Key, Globe, Webhook, CheckCircle2, AlertCircle,
  Copy, ExternalLink, MessageSquare, Phone, Settings2, ArrowRight,
  Info, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MetaConfig {
  id?: string;
  appId: string;
  appSecret: string;
  configId: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  phoneDisplay: string;
  webhookVerifyToken: string;
  webhookConfigured: boolean;
}

const STEPS = [
  { id: 1, label: "Configurar App Meta", icon: Settings2 },
  { id: 2, label: "Credenciais", icon: Key },
  { id: 3, label: "Embedded Signup", icon: Globe },
  { id: 4, label: "Webhook", icon: Webhook },
] as const;

export default function MetaOficialTab() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MetaConfig>({
    appId: "",
    appSecret: "",
    configId: "",
    accessToken: "",
    wabaId: "",
    phoneNumberId: "",
    phoneDisplay: "",
    webhookVerifyToken: "",
    webhookConfigured: false,
  });

  // Load existing config
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("meta_connections")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          appId: data.app_id || "",
          appSecret: data.app_secret || "",
          configId: data.config_id || "",
          accessToken: data.access_token || "",
          wabaId: data.waba_id || "",
          phoneNumberId: data.phone_number_id || "",
          phoneDisplay: data.phone_display || "",
          webhookVerifyToken: data.webhook_verify_token || "",
          webhookConfigured: data.webhook_configured || false,
        });
        // If already configured, go to step 4
        if (data.app_id && data.config_id) setStep(4);
      }
      setLoading(false);
    })();
  }, []);

  const updateConfig = (key: keyof MetaConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://knnwgijcrpbgqhdzmdrp.supabase.co"}/functions/v1/meta-webhook`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        app_id: config.appId,
        app_secret: config.appSecret,
        config_id: config.configId,
        access_token: config.accessToken,
        waba_id: config.wabaId,
        phone_number_id: config.phoneNumberId,
        phone_display: config.phoneDisplay,
        webhook_verify_token: config.webhookVerifyToken,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        await supabase.from("meta_connections").update(payload).eq("id", config.id);
      } else {
        const { data } = await supabase.from("meta_connections").insert(payload).select().single();
        if (data) setConfig((prev) => ({ ...prev, id: data.id }));
      }
      toast.success("Configuração salva com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar configuração");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-4 pt-5 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">WhatsApp Business Platform — API Oficial</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Conecte-se à API oficial da Meta. Mensagens recebidas e enviadas aparecerão na 
              <strong className="text-foreground"> mesma Caixa de Entrada</strong>, usando as mesmas filas do chat unificado.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Cloud API v21.0</Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">Inbox Unificado</Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">OAuth 2.0</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer">
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                step === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : step > s.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Configurar Aplicativo Meta
            </CardTitle>
            <CardDescription>Configure seu aplicativo no Painel de Desenvolvedores da Meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Passo a Passo:</h4>
              <ol className="space-y-2.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>
                  Acesse o{" "}
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Painel de Aplicativos Meta
                  </a>
                </li>
                <li>Vá em <strong className="text-foreground">Facebook Login for Business → Settings</strong></li>
                <li>Ative: Client OAuth login, Web OAuth login, Enforce HTTPS, Embedded Browser OAuth Login</li>
                <li>Adicione seu domínio nos campos <strong className="text-foreground">Allowed domains</strong></li>
                <li>Crie configuração com template <em>"WhatsApp Embedded Signup Configuration With 60 Expiration Token"</em></li>
                <li>Anote o <strong className="text-foreground">Configuration ID</strong></li>
              </ol>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Permissões necessárias: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">whatsapp_business_management</code> e{" "}
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">whatsapp_business_messaging</code>
              </p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setStep(2)} className="gap-1.5">Próximo <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Credenciais</CardTitle>
            <CardDescription>Insira as credenciais do seu aplicativo Meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appId" className="text-xs">Facebook App ID</Label>
                <Input id="appId" placeholder="123456789012345" value={config.appId} onChange={(e) => updateConfig("appId", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSecret" className="text-xs">App Secret</Label>
                <Input id="appSecret" type="password" placeholder="abc123def456..." value={config.appSecret} onChange={(e) => updateConfig("appSecret", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="configId" className="text-xs">Configuration ID (Embedded Signup)</Label>
                <Input id="configId" placeholder="987654321098765" value={config.configId} onChange={(e) => updateConfig("configId", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-xs">Access Token (longa duração)</Label>
                <Input id="accessToken" type="password" placeholder="EAAx..." value={config.accessToken} onChange={(e) => updateConfig("accessToken", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wabaId" className="text-xs">WABA ID</Label>
                <Input id="wabaId" placeholder="100200300400500" value={config.wabaId} onChange={(e) => updateConfig("wabaId", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId" className="text-xs">Phone Number ID</Label>
                <Input id="phoneNumberId" placeholder="200300400500600" value={config.phoneNumberId} onChange={(e) => updateConfig("phoneNumberId", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneDisplay" className="text-xs">Número de exibição</Label>
                <Input id="phoneDisplay" placeholder="+55 43 99901-1234" value={config.phoneDisplay} onChange={(e) => updateConfig("phoneDisplay", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="sm" onClick={() => { handleSave(); setStep(3); }} className="gap-1.5" disabled={!config.appId || !config.configId}>
                Salvar e Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Embedded Signup</CardTitle>
            <CardDescription>Conecte contas WhatsApp Business dos seus clientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" /> Fluxo de conexão
              </h4>
              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li>Cliente clica em <strong className="text-foreground">"Conectar WhatsApp"</strong></li>
                <li>SDK do Facebook abre popup OAuth</li>
                <li>Cliente seleciona WABA e número</li>
                <li>Sistema recebe <code className="text-[10px] bg-muted px-1 py-0.5 rounded">code</code> → troca por token</li>
                <li>Webhook configurado automaticamente</li>
              </ol>
            </div>
            <div className="rounded-lg border-2 border-dashed border-border p-6 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Phone className="h-7 w-7 text-emerald-400" />
              </div>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={!config.appId || !config.configId}>
                <ShieldCheck className="h-4 w-4" /> Conectar WhatsApp (Embedded Signup)
              </Button>
              {(!config.appId || !config.configId) && (
                <p className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Preencha App ID e Config ID na etapa anterior
                </p>
              )}
            </div>
            {config.wabaId && config.phoneNumberId && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Conta conectada</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">WABA ID:</span> <span className="font-mono text-foreground">{config.wabaId}</span></div>
                  <div><span className="text-muted-foreground">Phone Number ID:</span> <span className="font-mono text-foreground">{config.phoneNumberId}</span></div>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>Voltar</Button>
              <Button size="sm" onClick={() => setStep(4)} className="gap-1.5">Próximo <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" /> Webhook</CardTitle>
            <CardDescription>Configure o webhook para receber mensagens na caixa de entrada unificada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">URL do Webhook (cole no Meta Dashboard)</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="h-9 text-sm font-mono bg-muted/50" />
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => copyToClipboard(webhookUrl, "URL do webhook")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyToken" className="text-xs">Verify Token</Label>
                <div className="flex gap-2">
                  <Input id="verifyToken" value={config.webhookVerifyToken} onChange={(e) => updateConfig("webhookVerifyToken", e.target.value)} className="h-9 text-sm" />
                  <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => copyToClipboard(config.webhookVerifyToken, "Verify Token")}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Campos de inscrição</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { field: "messages", label: "Mensagens", desc: "Texto, mídia, localização, contatos" },
                  { field: "message_template_status_update", label: "Templates", desc: "Status de templates aprovados" },
                  { field: "account_update", label: "Conta", desc: "Eventos da conta WABA" },
                ].map((f) => (
                  <div key={f.field} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <Switch defaultChecked className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {config.webhookConfigured && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Webhook verificado e ativo</span>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Mensagens da API Oficial aparecerão na <strong className="text-foreground">Caixa de Entrada</strong> da Mensageria, nas mesmas filas do chat unificado.
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(3)}>Voltar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
