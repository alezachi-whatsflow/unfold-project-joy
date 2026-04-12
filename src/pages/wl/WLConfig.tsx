import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar, Save, Eye, EyeOff, CheckCircle2, ExternalLink,
  Shield, Loader2, Copy, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function WLConfig() {
  const { branding, wlLicenseId } = useOutletContext<{ branding: any; wlLicenseId: string | null }>();
  const queryClient = useQueryClient();

  // Load current Google credentials
  const { data: wlConfig, isLoading } = useQuery({
    queryKey: ["wl-google-config", wlLicenseId],
    queryFn: async () => {
      if (!wlLicenseId) return null;
      const { data } = await (supabase as any)
        .from("whitelabel_config")
        .select("id, google_client_id, google_client_secret, slug")
        .eq("license_id", wlLicenseId)
        .maybeSingle();
      return data;
    },
    enabled: !!wlLicenseId,
  });

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (wlConfig) {
      setClientId(wlConfig.google_client_id || "");
      setClientSecret(wlConfig.google_client_secret || "");
    }
  }, [wlConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wlConfig?.id) throw new Error("Config não encontrada");
      const { error } = await (supabase as any)
        .from("whitelabel_config")
        .update({
          google_client_id: clientId.trim() || null,
          google_client_secret: clientSecret.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wlConfig.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-google-config"] });
      toast.success("Credenciais Google Calendar salvas!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isConfigured = !!(wlConfig?.google_client_id && wlConfig?.google_client_secret);
  const supabaseUrl = (supabase as any).supabaseUrl || "https://supabase.whatsflow.com.br";
  const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações de integrações do seu Partner.</p>
      </div>

      {/* Google Calendar OAuth Config */}
      <Card className="rounded-xl" style={{ border: isConfigured ? "1px solid rgba(16,185,129,0.2)" : undefined }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(66,133,244,0.1)" }}>
              <Calendar className="h-4 w-4" style={{ color: "#4285F4" }} />
            </div>
            Google Calendar — Credenciais OAuth
            {isConfigured && (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure as credenciais do Google Cloud para que seus clientes possam conectar o Google Calendar.
            Cada cliente autoriza sua própria conta — você só configura uma vez.
          </p>

          {/* Setup guide */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--muted))" }}>
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Como configurar (uma vez):
            </p>
            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">console.cloud.google.com <ExternalLink className="h-2.5 w-2.5" /></a></li>
              <li>Crie um projeto → Ative a <strong>Google Calendar API</strong></li>
              <li>Vá em <strong>Credenciais → + Criar Credenciais → ID do cliente OAuth</strong></li>
              <li>Tipo: <strong>Aplicativo da Web</strong></li>
              <li>URI de redirecionamento autorizado:</li>
            </ol>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-[10px] bg-background px-2 py-1 rounded border flex-1 truncate">{callbackUrl}</code>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                onClick={() => { navigator.clipboard.writeText(callbackUrl); toast.success("URL copiada!"); }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <ol start={6} className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Cole o <strong>Client ID</strong> e <strong>Client Secret</strong> abaixo</li>
              <li>Clique <strong>Salvar</strong> — pronto, seus clientes podem conectar!</li>
            </ol>
          </div>

          {/* Credentials form */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Client ID</Label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  className="text-xs mt-1 rounded-lg font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Client Secret</Label>
                <div className="relative mt-1">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-..."
                    className="text-xs rounded-lg font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || (!clientId.trim() && !clientSecret.trim())}
                className="w-full gap-1.5 rounded-lg"
                style={{ backgroundColor: "var(--wl-primary, hsl(var(--primary)))" }}
              >
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Credenciais
              </Button>

              {!isConfigured && clientId && clientSecret && (
                <p className="text-[10px] text-amber-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Clique em Salvar para ativar a integração
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
