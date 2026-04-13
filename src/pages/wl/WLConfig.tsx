import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar, Save, Eye, EyeOff, CheckCircle2, ExternalLink,
  Shield, Loader2, Copy, AlertCircle, Mail, Send, Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function WLConfig() {
  const { branding, wlLicenseId } = useOutletContext<{ branding: any; wlLicenseId: string | null }>();
  const queryClient = useQueryClient();

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE CALENDAR CONFIG
  // ═══════════════════════════════════════════════════════════════
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

  const saveGoogleMutation = useMutation({
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

  // ═══════════════════════════════════════════════════════════════
  // SMTP CONFIG
  // ═══════════════════════════════════════════════════════════════
  const { data: smtpConfig, isLoading: smtpLoading } = useQuery({
    queryKey: ["wl-smtp-config", wlConfig?.id],
    queryFn: async () => {
      if (!wlConfig?.id) return null;
      const { data } = await (supabase as any)
        .from("partner_smtp_config")
        .select("id, provider, from_email, from_name, is_active, last_test_at, last_test_ok, last_error")
        .eq("whitelabel_config_id", wlConfig.id)
        .maybeSingle();
      return data;
    },
    enabled: !!wlConfig?.id,
  });

  const [smtpProvider, setSmtpProvider] = useState<string>("smtp2go");
  const [smtpApiKey, setSmtpApiKey] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    if (smtpConfig) {
      setSmtpProvider(smtpConfig.provider || "smtp2go");
      setSmtpFromEmail(smtpConfig.from_email || "");
      setSmtpFromName(smtpConfig.from_name || "");
      // Credentials are NOT returned to frontend (encrypted in DB)
      // User must re-enter to update
    }
  }, [smtpConfig]);

  const saveSmtpMutation = useMutation({
    mutationFn: async () => {
      if (!wlConfig?.id) throw new Error("Config WL não encontrada");

      // Call the server-side RPC function to encrypt and store credentials
      const { data, error } = await (supabase as any).rpc("upsert_partner_smtp", {
        p_whitelabel_config_id: wlConfig.id,
        p_provider: smtpProvider,
        p_api_key: smtpApiKey.trim() || null,
        p_smtp_host: smtpHost.trim() || null,
        p_smtp_port: parseInt(smtpPort) || 587,
        p_smtp_user: smtpUser.trim() || null,
        p_smtp_pass: smtpPass.trim() || null,
        p_smtp_secure: true,
        p_from_email: smtpFromEmail.trim(),
        p_from_name: smtpFromName.trim(),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-smtp-config"] });
      toast.success("Configuração SMTP salva com sucesso!");
      // Clear sensitive fields after save
      setSmtpApiKey("");
      setSmtpPass("");
    },
    onError: (err: any) => toast.error(`Erro ao salvar SMTP: ${err.message}`),
  });

  const testSmtpConnection = async () => {
    setTestingSmtp(true);
    try {
      // Invoke edge function to test SMTP
      const { data, error } = await supabase.functions.invoke("smtp-test", {
        body: { whitelabel_config_id: wlConfig?.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Conexão SMTP testada com sucesso! E-mail de teste enviado.");
        queryClient.invalidateQueries({ queryKey: ["wl-smtp-config"] });
      } else {
        toast.error(`Falha no teste: ${data?.error || "Erro desconhecido"}`);
      }
    } catch (err: any) {
      toast.error(`Erro no teste SMTP: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  const isGoogleConfigured = !!(wlConfig?.google_client_id && wlConfig?.google_client_secret);
  const isSmtpConfigured = !!smtpConfig?.is_active;
  const supabaseUrl = (supabase as any).supabaseUrl || "https://supabase.whatsflow.com.br";
  const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;
  const isApiProvider = smtpProvider === "smtp2go" || smtpProvider === "sendgrid";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações de integrações do seu Partner.</p>
      </div>

      {/* ═══ SMTP Config Card ═══ */}
      <Card className="rounded-xl" style={{ border: isSmtpConfigured ? "1px solid rgba(16,185,129,0.2)" : undefined }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(79,90,227,0.1)" }}>
              <Mail className="h-4 w-4" style={{ color: "#4F5AE3" }} />
            </div>
            E-mail Transacional — SMTP
            {isSmtpConfigured && (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                <CheckCircle2 className="h-3 w-3" /> Ativo
              </span>
            )}
            {smtpConfig && !smtpConfig.is_active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                <AlertCircle className="h-3 w-3" /> Inativo
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure seu próprio servidor SMTP para que e-mails de convite, ativação e recuperação de senha
            sejam enviados com a identidade da sua marca. Sem configuração, o sistema usa o SMTP global da IAZIS.
          </p>

          {smtpLoading || isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Provider selector */}
              <div>
                <Label className="text-xs">Provedor</Label>
                <Select value={smtpProvider} onValueChange={setSmtpProvider}>
                  <SelectTrigger className="mt-1 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp2go">SMTP2GO (Recomendado)</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">Amazon SES</SelectItem>
                    <SelectItem value="custom">SMTP Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sender identity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome do Remetente</Label>
                  <Input
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Whatsflow"
                    className="text-xs mt-1 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs">E-mail do Remetente</Label>
                  <Input
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="no-reply@suamarca.com.br"
                    className="text-xs mt-1 rounded-lg"
                  />
                </div>
              </div>

              {/* API Key (for SMTP2GO / SendGrid) */}
              {isApiProvider && (
                <div>
                  <Label className="text-xs">API Key</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showSmtpPass ? "text" : "password"}
                      value={smtpApiKey}
                      onChange={(e) => setSmtpApiKey(e.target.value)}
                      placeholder={smtpConfig ? "••••••• (salva — re-insira para alterar)" : "api-xxxxx..."}
                      className="text-xs rounded-lg font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* SMTP fields (for custom / SES) */}
              {!isApiProvider && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Host SMTP</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.smtp2go.com"
                        className="text-xs mt-1 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Porta</Label>
                      <Input
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="text-xs mt-1 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Usuário SMTP</Label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="sendhit"
                      className="text-xs mt-1 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Senha SMTP</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showSmtpPass ? "text" : "password"}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder={smtpConfig ? "••••••• (salva — re-insira para alterar)" : "senha..."}
                        className="text-xs rounded-lg font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Last test status */}
              {smtpConfig?.last_test_at && (
                <div className="rounded-lg p-2.5 text-[11px]" style={{ background: "hsl(var(--muted))" }}>
                  <span className="text-muted-foreground">Último teste: </span>
                  <span className={smtpConfig.last_test_ok ? "text-green-500" : "text-red-500"}>
                    {smtpConfig.last_test_ok ? "Sucesso" : "Falha"}
                  </span>
                  <span className="text-muted-foreground"> — {new Date(smtpConfig.last_test_at).toLocaleString("pt-BR")}</span>
                  {smtpConfig.last_error && !smtpConfig.last_test_ok && (
                    <p className="text-red-400 mt-1">{smtpConfig.last_error}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => saveSmtpMutation.mutate()}
                  disabled={saveSmtpMutation.isPending || !smtpFromEmail.trim() || !smtpFromName.trim()}
                  className="flex-1 gap-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--wl-primary, hsl(var(--primary)))" }}
                >
                  {saveSmtpMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar SMTP
                </Button>

                {isSmtpConfigured && (
                  <Button
                    variant="outline"
                    onClick={testSmtpConnection}
                    disabled={testingSmtp}
                    className="gap-1.5 rounded-lg"
                  >
                    {testingSmtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Testar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Google Calendar OAuth Config ═══ */}
      <Card className="rounded-xl" style={{ border: isGoogleConfigured ? "1px solid rgba(16,185,129,0.2)" : undefined }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(66,133,244,0.1)" }}>
              <Calendar className="h-4 w-4" style={{ color: "#4285F4" }} />
            </div>
            Google Calendar — Credenciais OAuth
            {isGoogleConfigured && (
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
                onClick={() => saveGoogleMutation.mutate()}
                disabled={saveGoogleMutation.isPending || (!clientId.trim() && !clientSecret.trim())}
                className="w-full gap-1.5 rounded-lg"
                style={{ backgroundColor: "var(--wl-primary, hsl(var(--primary)))" }}
              >
                {saveGoogleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Credenciais
              </Button>

              {!isGoogleConfigured && clientId && clientSecret && (
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
