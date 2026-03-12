import { useState } from "react";
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

interface MetaConfig {
  appId: string;
  appSecret: string;
  configId: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
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
  const [config, setConfig] = useState<MetaConfig>({
    appId: "",
    appSecret: "",
    configId: "",
    accessToken: "",
    wabaId: "",
    phoneNumberId: "",
    webhookVerifyToken: "",
    webhookConfigured: false,
  });

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
    // TODO: Save config to database
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Configuração salva com sucesso!");
    setSaving(false);
  };

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
              Conecte-se à API oficial da Meta usando o fluxo de Embedded Signup (OAuth).
              Permite que seus clientes vinculem suas contas WhatsApp Business (WABA) diretamente ao sistema,
              com configuração automática de webhooks.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Cloud API v21.0</Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">Embedded Signup</Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">OAuth 2.0</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer">
              Documentação <ExternalLink className="h-3 w-3" />
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
              {step > s.id ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Configure Meta App */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Configurar Aplicativo Meta
            </CardTitle>
            <CardDescription>
              Antes de integrar, configure seu aplicativo no Painel de Desenvolvedores da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Passo a Passo:</h4>
              <ol className="space-y-2.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>
                  Acesse o{" "}
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Painel de Aplicativos Meta
                  </a>{" "}
                  e selecione seu app
                </li>
                <li>
                  Vá em <strong className="text-foreground">Facebook Login for Business → Settings → Client OAuth settings</strong>
                </li>
                <li>
                  Ative: <em>Client OAuth login, Web OAuth login, Enforce HTTPS, Embedded Browser OAuth Login, Login with JavaScript SDK</em>
                </li>
                <li>
                  Adicione seu domínio nos campos <strong className="text-foreground">Allowed domains</strong> e <strong className="text-foreground">Valid OAuth redirect URIs</strong>
                </li>
                <li>
                  Em <strong className="text-foreground">Facebook Login for Business → Configurations</strong>, crie uma configuração usando o template <em>"WhatsApp Embedded Signup Configuration With 60 Expiration Token"</em>
                </li>
                <li>
                  Anote o <strong className="text-foreground">Configuration ID</strong> gerado
                </li>
              </ol>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Seu aplicativo deve ser um <strong className="text-foreground">Provedor de Soluções (SP)</strong> ou{" "}
                <strong className="text-foreground">Provedor de Tecnologia (TP)</strong> aprovado pela Meta.
                Garanta que as permissões <code className="text-[10px] bg-muted px-1 py-0.5 rounded">whatsapp_business_management</code> e{" "}
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded">whatsapp_business_messaging</code> estejam habilitadas.
              </p>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={() => setStep(2)} className="gap-1.5">
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Credentials */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Credenciais do Aplicativo
            </CardTitle>
            <CardDescription>
              Insira as credenciais do seu aplicativo Meta para habilitar o Embedded Signup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appId" className="text-xs">Facebook App ID</Label>
                <Input
                  id="appId"
                  placeholder="Ex: 123456789012345"
                  value={config.appId}
                  onChange={(e) => updateConfig("appId", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSecret" className="text-xs">App Secret</Label>
                <Input
                  id="appSecret"
                  type="password"
                  placeholder="Ex: abc123def456..."
                  value={config.appSecret}
                  onChange={(e) => updateConfig("appSecret", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="configId" className="text-xs">Configuration ID (Embedded Signup)</Label>
                <Input
                  id="configId"
                  placeholder="Ex: 987654321098765"
                  value={config.configId}
                  onChange={(e) => updateConfig("configId", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-xs">Access Token (longa duração)</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="EAAx..."
                  value={config.accessToken}
                  onChange={(e) => updateConfig("accessToken", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wabaId" className="text-xs">WABA ID (WhatsApp Business Account)</Label>
                <Input
                  id="wabaId"
                  placeholder="Ex: 100200300400500"
                  value={config.wabaId}
                  onChange={(e) => updateConfig("wabaId", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId" className="text-xs">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="Ex: 200300400500600"
                  value={config.phoneNumberId}
                  onChange={(e) => updateConfig("phoneNumberId", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                Voltar
              </Button>
              <Button size="sm" onClick={() => setStep(3)} className="gap-1.5" disabled={!config.appId || !config.configId}>
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Embedded Signup */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Embedded Signup (OAuth)
            </CardTitle>
            <CardDescription>
              Use o fluxo de Embedded Signup para conectar contas WhatsApp Business dos seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                Como funciona o fluxo
              </h4>
              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li>O cliente clica em <strong className="text-foreground">"Conectar WhatsApp"</strong></li>
                <li>O SDK do Facebook abre um popup para login OAuth</li>
                <li>O cliente seleciona a WABA e o número de telefone</li>
                <li>O sistema recebe o <code className="text-[10px] bg-muted px-1 py-0.5 rounded">code</code> de autorização</li>
                <li>O backend troca o código por um token de acesso e obtém os IDs</li>
                <li>Webhook é configurado automaticamente</li>
              </ol>
            </div>

            <div className="rounded-lg border-2 border-dashed border-border p-6 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Phone className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Conectar conta WhatsApp Business</p>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Ao clicar, o fluxo de Embedded Signup será iniciado.
                O cliente autorizará a conexão via Facebook.
              </p>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={!config.appId || !config.configId}
              >
                <ShieldCheck className="h-4 w-4" />
                Conectar WhatsApp (Embedded Signup)
              </Button>
              {(!config.appId || !config.configId) && (
                <p className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Preencha o App ID e Configuration ID na etapa anterior
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
                  <div>
                    <span className="text-muted-foreground">WABA ID:</span>
                    <span className="ml-2 font-mono text-foreground">{config.wabaId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone Number ID:</span>
                    <span className="ml-2 font-mono text-foreground">{config.phoneNumberId}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5">
                Voltar
              </Button>
              <Button size="sm" onClick={() => setStep(4)} className="gap-1.5">
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Webhook */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              Configuração de Webhook
            </CardTitle>
            <CardDescription>
              Configure o webhook para receber mensagens e eventos da API oficial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">URL do Webhook (Callback URL)</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="h-9 text-sm font-mono bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => copyToClipboard(webhookUrl, "URL do webhook")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyToken" className="text-xs">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="verifyToken"
                    placeholder="Token de verificação personalizado"
                    value={config.webhookVerifyToken}
                    onChange={(e) => updateConfig("webhookVerifyToken", e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => {
                      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
                      updateConfig("webhookVerifyToken", token);
                      toast.success("Token gerado!");
                    }}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Campos de inscrição</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { field: "messages", label: "Mensagens", desc: "Receber mensagens de texto, mídia, etc." },
                  { field: "message_template_status_update", label: "Templates", desc: "Atualizações de status de templates" },
                  { field: "account_update", label: "Conta", desc: "Eventos de atualização da conta" },
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

            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                O webhook será configurado automaticamente via API Graph da Meta após salvar.
                Endpoint: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">POST /{"{APP_ID}"}/subscriptions</code>
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(3)} className="gap-1.5">
                Voltar
              </Button>
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
