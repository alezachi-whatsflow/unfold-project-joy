import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings, Receipt, Calendar, FileText, MessageSquare, BarChart3,
  Save, Loader2, CheckCircle2, Bot, Mic, Image, FileUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssistantSettings {
  expense_enabled: boolean;
  expense_auto_confirm: boolean;
  expense_trigger_words: string;
  schedule_enabled: boolean;
  schedule_default_duration: number;
  summary_enabled: boolean;
  summary_max_length: number;
  finance_report_enabled: boolean;
  outbound_enabled: boolean;
  outbound_channels: string[];
  persona_name: string;
  persona_tone: string;
  confirmation_mode: string;
  language: string;
}

const DEFAULT_SETTINGS: AssistantSettings = {
  expense_enabled: true,
  expense_auto_confirm: false,
  expense_trigger_words: "despesa, gasto, nota fiscal, recibo, comprovante",
  schedule_enabled: true,
  schedule_default_duration: 30,
  summary_enabled: true,
  summary_max_length: 500,
  finance_report_enabled: true,
  outbound_enabled: true,
  outbound_channels: ["whatsapp", "email"],
  persona_name: "Assistente Whatsflow",
  persona_tone: "profissional",
  confirmation_mode: "always",
  language: "pt-BR",
};

const CAPABILITIES = [
  { key: "expense", icon: Receipt, label: "Lancamento de Despesas", desc: "Extrai dados de fotos de recibos/NFs via Vision AI", color: "text-emerald-500" },
  { key: "schedule", icon: Calendar, label: "Agendamento de Atividades", desc: "Cria reunioes, tarefas e follow-ups no CRM", color: "text-blue-500" },
  { key: "summary", icon: FileText, label: "Resumo de Conteudo", desc: "Resume audios, textos e documentos com action items", color: "text-purple-500" },
  { key: "finance_report", icon: BarChart3, label: "Relatorio Financeiro", desc: "Consulta e resume despesas por periodo/contexto", color: "text-amber-500" },
  { key: "outbound", icon: MessageSquare, label: "Agendamento de Mensagens", desc: "Programa envios futuros de WhatsApp/Email/SMS", color: "text-pink-500" },
];

export function AssistantConfig() {
  const tenantId = useTenantId();
  const [settings, setSettings] = useState<AssistantSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings from ai_configurations
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("ai_configurations")
        .select("metadata")
        .eq("tenant_id", tenantId)
        .eq("provider", "openai")
        .eq("is_active", true)
        .maybeSingle();
      if (data?.metadata?.assistant_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.metadata.assistant_settings });
      }
      setLoaded(true);
    })();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      // Get current config
      const { data: current } = await (supabase as any)
        .from("ai_configurations")
        .select("id, metadata")
        .eq("tenant_id", tenantId)
        .eq("provider", "openai")
        .eq("is_active", true)
        .maybeSingle();

      if (current) {
        await (supabase as any)
          .from("ai_configurations")
          .update({
            metadata: { ...(current.metadata || {}), assistant_settings: settings },
            updated_at: new Date().toISOString(),
          })
          .eq("id", current.id);
      }
      toast.success("Configuracoes salvas!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!loaded) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" /> Configuracao do Assistente Autonomo
        </h2>
        <p className="text-sm text-muted-foreground">
          Personalize o comportamento do agente de IA para cada capacidade
        </p>
      </div>

      {/* Persona */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Personalidade do Assistente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Nome do Assistente</Label>
              <Input value={settings.persona_name} onChange={(e) => update("persona_name", e.target.value)} placeholder="Assistente Whatsflow" />
            </div>
            <div>
              <Label>Tom de Comunicacao</Label>
              <Select value={settings.persona_tone} onValueChange={(v) => update("persona_tone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="tecnico">Tecnico</SelectItem>
                  <SelectItem value="amigavel">Amigavel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modo de Confirmacao</Label>
              <Select value={settings.confirmation_mode} onValueChange={(v) => update("confirmation_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Sempre confirmar antes de salvar</SelectItem>
                  <SelectItem value="expenses_only">Confirmar apenas despesas</SelectItem>
                  <SelectItem value="never">Salvar automaticamente (sem confirmar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Capacidades</h3>

        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          const enabledKey = `${cap.key}_enabled` as keyof AssistantSettings;
          const isEnabled = settings[enabledKey] as boolean;

          return (
            <Card key={cap.key} className={cn("transition-all", !isEnabled && "opacity-50")}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", isEnabled ? "bg-primary/10" : "bg-muted")}>
                      <Icon className={cn("h-5 w-5", isEnabled ? cap.color : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cap.label}</p>
                      <p className="text-xs text-muted-foreground">{cap.desc}</p>
                    </div>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={(v) => update(enabledKey, v)} />
                </div>

                {/* Capability-specific settings */}
                {isEnabled && cap.key === "expense" && (
                  <div className="mt-4 pl-12 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Confirmar automaticamente (sem perguntar)</Label>
                      <Switch checked={settings.expense_auto_confirm} onCheckedChange={(v) => update("expense_auto_confirm", v)} className="scale-75" />
                    </div>
                    <div>
                      <Label className="text-xs">Palavras-chave de ativacao</Label>
                      <Input value={settings.expense_trigger_words} onChange={(e) => update("expense_trigger_words", e.target.value)} className="text-xs h-8" placeholder="despesa, gasto, recibo..." />
                      <p className="text-[10px] text-muted-foreground mt-1">Separadas por virgula. A foto deve ter uma dessas palavras na legenda.</p>
                    </div>
                  </div>
                )}

                {isEnabled && cap.key === "schedule" && (
                  <div className="mt-4 pl-12 space-y-3">
                    <div>
                      <Label className="text-xs">Duracao padrao de reunioes (minutos)</Label>
                      <Input type="number" min={15} max={120} step={15} value={settings.schedule_default_duration} onChange={(e) => update("schedule_default_duration", Number(e.target.value))} className="w-24 h-8 text-xs" />
                    </div>
                    <GoogleCalendarConnect />
                  </div>
                )}

                {isEnabled && cap.key === "summary" && (
                  <div className="mt-4 pl-12">
                    <div>
                      <Label className="text-xs">Tamanho maximo do resumo (caracteres)</Label>
                      <Input type="number" min={100} max={2000} step={100} value={settings.summary_max_length} onChange={(e) => update("summary_max_length", Number(e.target.value))} className="w-24 h-8 text-xs" />
                    </div>
                  </div>
                )}

                {isEnabled && cap.key === "outbound" && (
                  <div className="mt-4 pl-12">
                    <Label className="text-xs">Canais permitidos</Label>
                    <div className="flex gap-3 mt-1">
                      {["whatsapp", "email", "sms"].map((ch) => (
                        <label key={ch} className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={settings.outbound_channels.includes(ch)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                update("outbound_channels", [...settings.outbound_channels, ch]);
                              } else {
                                update("outbound_channels", settings.outbound_channels.filter((c) => c !== ch));
                              }
                            }}
                            className="rounded"
                          />
                          {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "E-mail" : "SMS"}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Input types supported */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Formatos de entrada suportados</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1.5 text-xs"><MessageSquare className="h-3 w-3" /> Texto</Badge>
            <Badge variant="outline" className="gap-1.5 text-xs"><Image className="h-3 w-3" /> Imagens (JPG, PNG)</Badge>
            <Badge variant="outline" className="gap-1.5 text-xs"><FileUp className="h-3 w-3" /> Documentos (PDF)</Badge>
            <Badge variant="outline" className="gap-1.5 text-xs"><Mic className="h-3 w-3" /> Audio (Whisper AI)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar Configuracoes"}
        </Button>
      </div>
    </div>
  );
}

/* ── Google Calendar Connection Widget ── */
function GoogleCalendarConnect() {
  const [status, setStatus] = useState<{ connected: boolean; email?: string; name?: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    if (!backendUrl) { setChecking(false); return; }
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) { setChecking(false); return; }
        const res = await fetch(`${backendUrl}/auth/google/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setStatus(json);
      } catch { setStatus({ connected: false }); }
      finally { setChecking(false); }
    })();
  }, [backendUrl]);

  const handleConnect = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !backendUrl) {
      toast.error("Backend nao configurado. Adicione VITE_BACKEND_URL.");
      return;
    }
    window.location.href = `${backendUrl}/auth/google?jwt=${token}`;
  };

  const handleDisconnect = async () => {
    if (!backendUrl) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    await fetch(`${backendUrl}/auth/google/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    setStatus({ connected: false });
    toast.success("Google Calendar desconectado");
  };

  if (!backendUrl) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <Calendar className="h-4 w-4 inline mr-1" />
        Google Calendar disponivel quando o Backend estiver configurado.
      </div>
    );
  }

  if (checking) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="p-3 border border-border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold">Google Calendar</span>
        </div>
        {status?.connected ? (
          <Badge variant="default" className="text-[9px] bg-emerald-500">Conectado</Badge>
        ) : (
          <Badge variant="secondary" className="text-[9px]">Desconectado</Badge>
        )}
      </div>
      {status?.connected ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{status.email}</span>
          <Button size="sm" variant="ghost" className="text-[10px] text-destructive h-6" onClick={handleDisconnect}>
            Desconectar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={handleConnect}>
          <Calendar className="h-3 w-3" /> Conectar Google Calendar
        </Button>
      )}
    </div>
  );
}
