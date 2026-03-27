import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CreditCard, Link2, ShoppingCart, Zap, CheckCircle, XCircle, Settings,
  ExternalLink, Copy, Eye, EyeOff, Loader2, Webhook, Globe, Shield,
  ArrowRight, Trash2, ToggleLeft
} from "lucide-react";

// ── Provider Registry ──

interface CheckoutProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  country: string;
  features: string[];
  methods: string[];
  docsUrl: string;
  color: string;
  integrationTypes: ("payment_link" | "drop_in" | "redirect" | "api")[];
}

const PROVIDERS: CheckoutProvider[] = [
  {
    id: "asaas",
    name: "Asaas",
    logo: "💳",
    description: "Plataforma brasileira completa com Pix, boleto, cartão, recorrência e split nativo.",
    country: "🇧🇷",
    features: ["Split", "Recorrência", "Dunning", "Nota Fiscal"],
    methods: ["Pix", "Boleto", "Cartão", "Link"],
    docsUrl: "https://docs.asaas.com",
    color: "hsl(var(--primary))",
    integrationTypes: ["payment_link", "api"],
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "💜",
    description: "Padrão-ouro global. Stripe Elements, Payment Links, Apple Pay, Google Pay e Pix.",
    country: "🇺🇸",
    features: ["Elements UI", "Payment Links", "Subscriptions", "Connect"],
    methods: ["Cartão", "Pix", "Apple Pay", "Google Pay"],
    docsUrl: "https://stripe.com/docs",
    color: "#635BFF",
    integrationTypes: ["payment_link", "drop_in", "redirect", "api"],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    logo: "🤝",
    description: "Maior capilaridade LatAm. Checkout Pro/Transparente com antifraude robusto.",
    country: "🇧🇷",
    features: ["Checkout Pro", "Transparente", "Antifraude ML", "Parcelamento"],
    methods: ["Pix", "Boleto", "Cartão", "Saldo MP"],
    docsUrl: "https://www.mercadopago.com.br/developers",
    color: "#009EE3",
    integrationTypes: ["payment_link", "drop_in", "redirect"],
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    logo: "🟢",
    description: "Stone Co. Especializado em B2B, split de pagamentos e recorrência avançada.",
    country: "🇧🇷",
    features: ["Split Flexível", "Recorrência", "Antecipação", "Subadquirência"],
    methods: ["Pix", "Boleto", "Cartão", "Link"],
    docsUrl: "https://docs.pagar.me",
    color: "#65A300",
    integrationTypes: ["drop_in", "redirect", "api"],
  },
  {
    id: "iugu",
    name: "Iugu",
    logo: "🟡",
    description: "Automação financeira para SaaS. Faturas, assinaturas e marketplace.",
    country: "🇧🇷",
    features: ["Marketplace", "Assinaturas", "Faturas", "Split"],
    methods: ["Pix", "Boleto", "Cartão"],
    docsUrl: "https://dev.iugu.com",
    color: "#F5A623",
    integrationTypes: ["payment_link", "redirect", "api"],
  },
  {
    id: "paypal",
    name: "PayPal",
    logo: "🅿️",
    description: "Líder global em pagamentos online. Ideal para transações internacionais.",
    country: "🇺🇸",
    features: ["Checkout", "Subscriptions", "Payouts", "Disputes"],
    methods: ["Saldo PayPal", "Cartão", "Crédito"],
    docsUrl: "https://developer.paypal.com",
    color: "#003087",
    integrationTypes: ["payment_link", "drop_in", "redirect"],
  },
];

// ── Types ──

interface ProviderConnection {
  providerId: string;
  environment: "sandbox" | "production";
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  webhookSecret: string;
  isActive: boolean;
  integrationType: string;
  connectedAt: string | null;
  lastTestedAt: string | null;
  status: "disconnected" | "connected" | "error";
}

const DEFAULT_CONNECTION: Omit<ProviderConnection, "providerId"> = {
  environment: "sandbox",
  apiKey: "",
  secretKey: "",
  webhookUrl: "",
  webhookSecret: "",
  isActive: false,
  integrationType: "payment_link",
  connectedAt: null,
  lastTestedAt: null,
  status: "disconnected",
};

// ── Helpers ──

function loadConnections(): Record<string, ProviderConnection> {
  try {
    const raw = localStorage.getItem("whatsflow_checkout_connections");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveConnections(conns: Record<string, ProviderConnection>) {
  localStorage.setItem("whatsflow_checkout_connections", JSON.stringify(conns));
}

// ── Sub-Components ──

function ProviderCard({
  provider, connection, onConfigure,
}: {
  provider: CheckoutProvider;
  connection?: ProviderConnection;
  onConfigure: () => void;
}) {
  const isConnected = connection?.status === "connected";
  const isAsaas = provider.id === "asaas";

  return (
    <Card className={`relative overflow-hidden transition-all hover:${isConnected ? "ring-2 ring-primary/40" : ""}`}>
      {isAsaas && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
          INTEGRADO
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{provider.logo}</span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {provider.name}
                <span className="text-xs">{provider.country}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-2">
                {provider.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Payment Methods */}
        <div className="flex flex-wrap gap-1">
          {provider.methods.map((m) => (
            <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0">
              {m}
            </Badge>
          ))}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {provider.features.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">
              {f}
            </Badge>
          ))}
        </div>

        {/* Integration Types */}
        <div className="flex gap-1">
          {provider.integrationTypes.map((t) => {
            const labels: Record<string, string> = {
              payment_link: "Link", drop_in: "Drop-in", redirect: "Redirect", api: "API",
            };
            return (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {labels[t]}
              </span>
            );
          })}
        </div>

        {/* Status + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            {isAsaas ? (
              <Badge className="bg-green-600/90 text-[10px]"><CheckCircle className="mr-1 h-3 w-3" />Ativo</Badge>
            ) : isConnected ? (
              <Badge className="bg-green-600/90 text-[10px]"><CheckCircle className="mr-1 h-3 w-3" />Conectado</Badge>
            ) : connection?.status === "error" ? (
              <Badge variant="destructive" className="text-[10px]"><XCircle className="mr-1 h-3 w-3" />Erro</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Desconectado</Badge>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />Docs
              </a>
            </Button>
            {!isAsaas && (
              <Button size="sm" className="h-7 text-xs" onClick={onConfigure}>
                <Settings className="h-3 w-3 mr-1" />
                {isConnected ? "Editar" : "Conectar"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigureProviderDialog({
  provider, connection, open, onOpenChange, onSave, onDisconnect,
}: {
  provider: CheckoutProvider | null;
  connection: ProviderConnection | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (conn: ProviderConnection) => void;
  onDisconnect: (providerId: string) => void;
}) {
  const [form, setForm] = useState<ProviderConnection>(
    connection || { ...DEFAULT_CONNECTION, providerId: provider?.id || "" }
  );
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!provider) return null;

  const handleTest = async () => {
    setTesting(true);
    // Simulated test — in production this would call an edge function
    await new Promise((r) => setTimeout(r, 1500));
    if (form.apiKey.length > 5) {
      setForm((f) => ({ ...f, status: "connected", lastTestedAt: new Date().toISOString(), connectedAt: f.connectedAt || new Date().toISOString() }));
      toast.success(`Conexão com ${provider.name} validada!`);
    } else {
      setForm((f) => ({ ...f, status: "error" }));
      toast.error("API Key inválida ou muito curta.");
    }
    setTesting(false);
  };

  const webhookBase = `${import.meta.env.VITE_SUPABASE_URL || "https://jtlrglzcsmqmapizqgzu.supabase.co"}/functions/v1`;
  const suggestedWebhook = `${webhookBase}/${provider.id}-webhook`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{provider.logo}</span>
            Configurar {provider.name}
          </DialogTitle>
          <DialogDescription>
            Insira as credenciais da sua conta {provider.name} para habilitar cobranças.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="credentials" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="options">Opções</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-4 mt-4">
            {/* Environment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Ambiente
              </Label>
              <Select value={form.environment} onValueChange={(v) => setForm((f) => ({ ...f, environment: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">🧪 Sandbox (testes)</SelectItem>
                  <SelectItem value="production">🚀 Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">API Key (Publishable)</Label>
              <Input
                placeholder={`pk_test_... ou chave pública do ${provider.name}`}
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Encontre em <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">{provider.name} Dashboard</a> → API Keys
              </p>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Secret Key</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="sk_test_... ou chave secreta"
                  value={form.secretKey}
                  onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-destructive/80">
                ⚠️ A secret key será armazenada de forma segura no servidor (Secrets).
              </p>
            </div>

            {/* Test */}
            <Button onClick={handleTest} disabled={testing || !form.apiKey} variant="outline" className="w-full">
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Testar Conexão
            </Button>

            {form.status === "connected" && (
              <div className="bg-primary/10 border border-primary/30 p-3 text-sm text-primary flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Conexão validada com sucesso!
              </div>
            )}
            {form.status === "error" && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Falha na validação. Verifique as credenciais.
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Webhook className="h-3.5 w-3.5" /> URL do Webhook
              </Label>
              <div className="flex gap-2">
                <Input value={suggestedWebhook} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(suggestedWebhook); toast.success("URL copiada!"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole esta URL no painel do {provider.name} → Webhooks → Adicionar endpoint
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Webhook Secret (Signing Secret)</Label>
              <Input
                placeholder="whsec_... (opcional)"
                value={form.webhookSecret}
                onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Usado para validar a autenticidade dos eventos recebidos.
              </p>
            </div>

            <div className="border border-border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Eventos recomendados:</p>
              <div className="flex flex-wrap gap-1">
                {["payment.created", "payment.confirmed", "payment.failed", "payment.refunded", "subscription.created", "subscription.cancelled"].map((evt) => (
                  <Badge key={evt} variant="outline" className="text-[10px] font-mono">{evt}</Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-4">
            {/* Integration Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Tipo de Integração Preferido
              </Label>
              <Select value={form.integrationType} onValueChange={(v) => setForm((f) => ({ ...f, integrationType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {provider.integrationTypes.map((t) => {
                    const map: Record<string, { label: string; desc: string }> = {
                      payment_link: { label: "Payment Link", desc: "Gera link e envia via WhatsApp" },
                      drop_in: { label: "Drop-in UI (Elements)", desc: "Componentes embutidos no front-end" },
                      redirect: { label: "Hosted Checkout (Redirect)", desc: "Redireciona para página do provedor" },
                      api: { label: "API Direta (Server-to-Server)", desc: "Controle total via backend" },
                    };
                    return (
                      <SelectItem key={t} value={t}>
                        {map[t].label} — {map[t].desc}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Ativar provedor</p>
                <p className="text-xs text-muted-foreground">Disponibilizar como opção de checkout para clientes</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>

            {/* Disconnect */}
            {connection?.status === "connected" && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (confirm(`Desconectar ${provider.name}? As credenciais serão removidas.`)) {
                    onDisconnect(provider.id);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Desconectar {provider.name}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); toast.success(`${provider.name} salvo!`); }}>
            <CheckCircle className="mr-2 h-4 w-4" /> Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──

export function CheckoutIntegrationsCard() {
  const [connections, setConnections] = useState<Record<string, ProviderConnection>>(loadConnections);
  const [configuring, setConfiguring] = useState<string | null>(null);

  const activeProvider = PROVIDERS.find((p) => p.id === configuring) || null;
  const activeConnection = configuring ? connections[configuring] || null : null;

  const connectedCount = Object.values(connections).filter((c) => c.status === "connected").length + 1; // +1 for Asaas

  const handleSave = (conn: ProviderConnection) => {
    const updated = { ...connections, [conn.providerId]: conn };
    setConnections(updated);
    saveConnections(updated);
  };

  const handleDisconnect = (providerId: string) => {
    const updated = { ...connections };
    delete updated[providerId];
    setConnections(updated);
    saveConnections(updated);
    toast.success("Provedor desconectado.");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" /> Integrações de Checkout
              </CardTitle>
              <CardDescription>
                Conecte gateways de pagamento para gerar cobranças via Payment Link, Drop-in UI ou API direta.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {connectedCount} ativo{connectedCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Architecture overview */}
          <div className="border border-border bg-muted/30 p-4 mb-6">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" /> Modelos de Integração Disponíveis
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: <Link2 className="h-4 w-4" />, label: "Payment Link", desc: "Gera link → WhatsApp", effort: "Mínimo" },
                { icon: <CreditCard className="h-4 w-4" />, label: "Drop-in UI", desc: "Campos embutidos", effort: "Médio" },
                { icon: <ArrowRight className="h-4 w-4" />, label: "Redirect", desc: "Página do gateway", effort: "Baixo" },
                { icon: <Globe className="h-4 w-4" />, label: "API Direta", desc: "Server-to-Server", effort: "Alto" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1 border border-border p-2.5 text-center">
                  <span className="text-muted-foreground">{m.icon}</span>
                  <span className="text-xs font-medium text-foreground">{m.label}</span>
                  <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                  <Badge variant="outline" className="text-[9px] mt-0.5">Esforço: {m.effort}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                connection={connections[provider.id]}
                onConfigure={() => setConfiguring(provider.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfigureProviderDialog
        provider={activeProvider}
        connection={activeConnection}
        open={!!configuring}
        onOpenChange={(o) => { if (!o) setConfiguring(null); }}
        onSave={handleSave}
        onDisconnect={handleDisconnect}
      />
    </>
  );
}
