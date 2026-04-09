/**
 * AsaasSetupModal — Smart Onboarding "Plug & Play"
 * User provides ONLY the API Key.
 * System automatically: validates → fetches wallet → registers webhook.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CheckCircle2, XCircle, Shield, Wallet, Webhook, ArrowRight,
  Eye, EyeOff, ExternalLink, AlertTriangle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

type Step = "input" | "processing" | "success" | "error";

interface SetupResult {
  account_name: string;
  wallet_id: string;
  environment: string;
  webhook_registered: boolean;
  webhook_url?: string;
}

export function AsaasSetupModal({ open, onOpenChange, onConnected }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [showKey, setShowKey] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setStep("input");
    setProgress([]);
    setResult(null);
    setErrorMsg("");
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || apiKey.length < 10) {
      toast.error("Cole a chave completa do Asaas");
      return;
    }

    setStep("processing");
    setProgress(["Validando API Key..."]);

    try {
      const { data, error } = await supabase.functions.invoke("asaas-setup", {
        body: { api_key: apiKey.trim(), environment },
      });

      if (error) throw error;

      if (data?.error_code === "WRONG_ENVIRONMENT") {
        // Auto-detected wrong environment — switch and retry
        setEnvironment("sandbox");
        setStep("error");
        setErrorMsg("Esta chave é de Sandbox. Troque o ambiente para Sandbox e tente novamente.");
        return;
      }

      if (data?.error_code || data?.error) {
        setStep("error");
        setErrorMsg(data.message || data.error || "Erro na configuração");
        return;
      }

      if (data?.success) {
        setProgress([
          `✓ Conta validada: ${data.account_name}`,
          data.wallet_id ? `✓ Wallet ID: ${data.wallet_id}` : "✓ Conta verificada",
          data.webhook_registered ? "✓ Webhook registrado automaticamente" : "⚠ Webhook: configure manualmente se necessário",
          "✓ Chave salva com segurança",
        ]);
        setResult(data);
        setStep("success");

        // Also save to localStorage for backward compatibility
        try {
          const stored = JSON.parse(localStorage.getItem("whatsflow_checkout_connections") || "{}");
          stored.asaas = {
            providerId: "asaas",
            environment,
            apiKey: apiKey.trim(),
            status: "connected",
            connectedAt: new Date().toISOString(),
            isActive: true,
          };
          localStorage.setItem("whatsflow_checkout_connections", JSON.stringify(stored));
        } catch {}

        onConnected();
      } else {
        throw new Error("Resposta inesperada do servidor");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Erro ao configurar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Conectar Asaas
          </DialogTitle>
        </DialogHeader>

        {/* ═══ STEP: Input ═══ */}
        {step === "input" && (
          <div className="space-y-5 mt-2">
            <p className="text-sm text-muted-foreground">
              Cole sua chave de API e clique em conectar. Configuraremos tudo automaticamente.
            </p>

            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">🔵 Produção (real)</SelectItem>
                  <SelectItem value="sandbox">🟡 Sandbox (testes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key (Chave de Integração)</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="$aact_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Encontre em{" "}
                <a href="https://www.asaas.com/config/index" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                  Asaas → Integrações → Chaves de API <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            </div>

            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">O que será configurado automaticamente:</p>
              <div className="flex items-center gap-2"><Shield className="h-3 w-3 text-primary" /> Validação da conta e status KYC</div>
              <div className="flex items-center gap-2"><Wallet className="h-3 w-3 text-primary" /> Captura do Wallet ID</div>
              <div className="flex items-center gap-2"><Webhook className="h-3 w-3 text-primary" /> Registro de Webhook para pagamentos</div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={!apiKey.trim() || apiKey.length < 10}
              className="w-full gap-2"
              size="lg"
            >
              <ArrowRight className="h-4 w-4" />
              Conectar Conta Asaas
            </Button>
          </div>
        )}

        {/* ═══ STEP: Processing ═══ */}
        {step === "processing" && (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm font-medium">Configurando sua conta...</p>
            <div className="space-y-1.5">
              {progress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP: Success ═══ */}
        {step === "success" && result && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Asaas Conectado!</h3>
              <p className="text-sm text-muted-foreground mt-1">{result.account_name}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
              {progress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  {p.startsWith("✓") ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> : <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                  {p.replace(/^[✓⚠]\s*/, "")}
                </div>
              ))}
            </div>

            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
              Concluir
            </Button>
          </div>
        )}

        {/* ═══ STEP: Error ═══ */}
        {step === "error" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-rose-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-rose-400">Erro na Configuração</h3>
              <p className="text-sm text-muted-foreground mt-2">{errorMsg}</p>
            </div>
            <Button onClick={reset} variant="outline" className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
