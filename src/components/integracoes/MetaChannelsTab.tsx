import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChannelIntegrations, type ChannelIntegration } from "@/hooks/useChannelIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, MessageSquare, Instagram, CheckCircle2, XCircle, Clock, Trash2,
  RefreshCw, Phone, Hash, Facebook, Shield, Star, Building2,
  CalendarClock, AlertTriangle, RotateCcw, Smartphone, ShieldOff, Info,
} from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";

// ─── Status Config ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Ativo", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  inactive: { label: "Inativo", color: "text-muted-foreground bg-muted/50 border-border", icon: XCircle },
  error: { label: "Erro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
};

// ─── Error State Definitions ─────────────────────────────────────────────────
interface OAuthError {
  error_code: string;
  message: string;
  provider?: string;
  details?: Record<string, any>;
}

const ERROR_CARD_CONFIG: Record<string, {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  actionLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  INCOMPLETE_SIGNUP: {
    icon: Info,
    title: "Quase lá!",
    description: "Precisamos que você escolha o número de telefone na tela do Facebook. O processo não foi finalizado.",
    actionLabel: "Retomar Configuração",
    color: "text-amber-400",
    bgColor: "bg-amber-400/5",
    borderColor: "border-amber-400/20",
  },
  NUMBER_IN_OTHER_WABA_OR_APP: {
    icon: Smartphone,
    title: "Número em uso",
    description: "Este número já está registrado no WhatsApp pessoal ou em outro WhatsApp Business. Exclua a conta WhatsApp do celular para liberar o número.",
    actionLabel: "Tentar Novamente",
    color: "text-rose-400",
    bgColor: "bg-rose-400/5",
    borderColor: "border-rose-400/20",
  },
  NUMBER_IN_OTHER_BSP: {
    icon: ShieldOff,
    title: "Número retido por outro provedor",
    description: "Desative a Verificação em Duas Etapas (2FA) no seu provedor antigo para forçar a migração do número para esta plataforma.",
    actionLabel: "Tentar Novamente",
    color: "text-orange-400",
    bgColor: "bg-orange-400/5",
    borderColor: "border-orange-400/20",
  },
  USER_CANCELLED: {
    icon: XCircle,
    title: "Autorização cancelada",
    description: "Você fechou a janela do Facebook antes de completar. Nenhuma alteração foi feita.",
    actionLabel: "Tentar Novamente",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
  },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MetaChannelsTab() {
  const { data: integrations = [], isLoading, tenantId, invalidate } = useChannelIntegrations();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<OAuthError | null>(null);
  const [messengerModalOpen, setMessengerModalOpen] = useState(false);
  const [messengerForm, setMessengerForm] = useState({ pageId: "", pageToken: "", pageName: "" });
  const [savingMessenger, setSavingMessenger] = useState(false);

  // Listen for postMessage from OAuth popup
  const handleOAuthMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== "object" || !("success" in event.data)) return;
    const { success, message, error_code, provider, details } = event.data;

    setConnecting(null);
    queryClient.invalidateQueries({ queryKey: ["channel-integrations"] });

    if (success) {
      setOauthError(null);
      toast.success(message || "Conexão realizada!");
    } else if (error_code && ERROR_CARD_CONFIG[error_code]) {
      // Known error → show Error Card (suppress generic toast)
      setOauthError({ error_code, message, provider, details });
    } else {
      // Unknown error → toast fallback
      toast.error(message || "Erro na conexão");
    }
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [handleOAuthMessage]);

  const whatsappIntegrations = integrations.filter(i => i.provider === "WABA");
  const instagramIntegrations = integrations.filter(i => i.provider === "INSTAGRAM");
  const messengerIntegrations = integrations.filter(i => i.provider === "MESSENGER");

  async function saveMessengerConnection() {
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    if (!messengerForm.pageId || !messengerForm.pageToken) { toast.error("Preencha todos os campos"); return; }
    setSavingMessenger(true);
    try {
      const { error } = await supabase.from("channel_integrations").upsert({
        tenant_id: tenantId,
        provider: "MESSENGER",
        facebook_page_id: messengerForm.pageId,
        page_access_token: messengerForm.pageToken,
        page_name: messengerForm.pageName || `Página ${messengerForm.pageId}`,
        name: messengerForm.pageName || `Messenger ${messengerForm.pageId}`,
        access_token: messengerForm.pageToken,
        status: "active",
        channel_id: `messenger_${messengerForm.pageId}`,
      }, { onConflict: "channel_id" });
      if (error) throw error;
      toast.success("Facebook Messenger conectado com sucesso!");
      setMessengerModalOpen(false);
      setMessengerForm({ pageId: "", pageToken: "", pageName: "" });
      invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar conexão");
    } finally {
      setSavingMessenger(false);
    }
  }

  async function startOAuth(provider: "WABA" | "INSTAGRAM") {
    if (!tenantId) { toast.error("Tenant nao identificado"); return; }
    setConnecting(provider);
    setOauthError(null); // Clear previous error card
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
        body: { provider, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.auth_url) {
        const w = 600, h = 700;
        const left = window.screenX + (window.innerWidth - w) / 2;
        const top = window.screenY + (window.innerHeight - h) / 2;
        const popup = window.open(
          data.auth_url,
          "meta_oauth",
          `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`
        );

        const checkClosed = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkClosed);
            setConnecting(null);
            queryClient.invalidateQueries({ queryKey: ["channel-integrations"] });
          }
        }, 1000);
      } else {
        throw new Error("URL de autorizacao nao retornada");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar conexao");
      setConnecting(null);
    }
  }

  async function toggleStatus(integration: ChannelIntegration) {
    const newStatus = integration.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("channel_integrations")
      .update({ status: newStatus })
      .eq("id", integration.id);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(`Integração ${newStatus === "active" ? "ativada" : "desativada"}`);
      invalidate();
    }
  }

  async function deleteIntegration(integration: ChannelIntegration) {
    if (!confirm(`Remover integração "${integration.name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase
      .from("channel_integrations")
      .delete()
      .eq("id", integration.id);
    if (error) {
      toast.error("Erro ao remover");
    } else {
      toast.success("Integração removida");
      invalidate();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══ WHATSAPP API OFICIAL ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelIcon channel="whatsapp_meta" size="lg" variant="icon" />
            <div>
              <h2 className="text-lg font-bold">WhatsApp API Cloud Meta</h2>
              <p className="text-xs text-muted-foreground">Integração via Meta Business — envie e receba mensagens pela API oficial</p>
            </div>
          </div>
          <Button
            onClick={() => startOAuth("WABA")}
            disabled={connecting === "WABA"}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {connecting === "WABA" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
            Conectar com WhatsApp API Cloud Meta
          </Button>
        </div>

        {/* Error Card — shown when OAuth returns a classified error */}
        {oauthError && (oauthError.provider === "WABA" || !oauthError.provider) && (
          <ErrorActionCard
            error={oauthError}
            onRetry={() => startOAuth("WABA")}
            onDismiss={() => setOauthError(null)}
          />
        )}

        {whatsappIntegrations.length === 0 && !oauthError ? (
          <Card className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum número WhatsApp conectado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Conectar WhatsApp" para iniciar o processo de vinculação via Meta</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {whatsappIntegrations.map(i => (
              <IntegrationCard key={i.id} integration={i} onToggle={toggleStatus} onDelete={deleteIntegration} onReconnect={() => startOAuth("WABA")} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ INSTAGRAM MESSAGING ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelIcon channel="instagram" size="lg" variant="icon" />
            <div>
              <h2 className="text-lg font-bold">Instagram Messaging</h2>
              <p className="text-xs text-muted-foreground">Receba e responda DMs do Instagram diretamente no sistema</p>
            </div>
          </div>
          <Button
            onClick={() => startOAuth("INSTAGRAM")}
            disabled={connecting === "INSTAGRAM"}
            variant="outline"
            className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
          >
            {connecting === "INSTAGRAM" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Instagram className="h-4 w-4 mr-2" />}
            Conectar Instagram
          </Button>
        </div>

        {/* Instagram Error Card */}
        {oauthError && oauthError.provider === "INSTAGRAM" && (
          <ErrorActionCard
            error={oauthError}
            onRetry={() => startOAuth("INSTAGRAM")}
            onDismiss={() => setOauthError(null)}
          />
        )}

        {instagramIntegrations.length === 0 && !(oauthError?.provider === "INSTAGRAM") ? (
          <Card className="p-6 text-center">
            <Instagram className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma conta Instagram conectada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Conecte sua página do Facebook com perfil Instagram Business</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {instagramIntegrations.map(i => (
              <IntegrationCard key={i.id} integration={i} onToggle={toggleStatus} onDelete={deleteIntegration} onReconnect={() => startOAuth("INSTAGRAM")} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ FACEBOOK MESSENGER ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelIcon channel="facebook" size="lg" variant="icon" />
            <div>
              <h2 className="text-lg font-bold">Facebook Messenger</h2>
              <p className="text-xs text-muted-foreground">Receba e responda mensagens da sua Página do Facebook diretamente no sistema</p>
            </div>
          </div>
          <Button
            onClick={() => setMessengerModalOpen(true)}
            variant="outline"
            className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
          >
            <Facebook className="h-4 w-4 mr-2" />
            Conectar Messenger
          </Button>
        </div>

        {messengerIntegrations.length === 0 ? (
          <Card className="p-6 text-center">
            <Facebook className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma página do Facebook conectada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Conecte sua Página do Facebook para receber mensagens do Messenger</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {messengerIntegrations.map(i => (
              <IntegrationCard key={i.id} integration={i} onToggle={toggleStatus} onDelete={deleteIntegration} onReconnect={() => setMessengerModalOpen(true)} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ MESSENGER CONNECTION MODAL ═══ */}
      <Dialog open={messengerModalOpen} onOpenChange={setMessengerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-500" /> Conectar Facebook Messenger
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome da Página (opcional)</Label>
              <Input placeholder="Ex: Minha Empresa" value={messengerForm.pageName} onChange={(e) => setMessengerForm({ ...messengerForm, pageName: e.target.value })} />
            </div>
            <div>
              <Label>ID da Página (Page ID) *</Label>
              <Input placeholder="Ex: 123456789012345" value={messengerForm.pageId} onChange={(e) => setMessengerForm({ ...messengerForm, pageId: e.target.value })} />
              <p className="text-[10px] text-muted-foreground mt-1">Encontre em: Página do Facebook → Configurações → Sobre → ID da página</p>
            </div>
            <div>
              <Label>Token de Acesso (Page Access Token) *</Label>
              <Input type="password" placeholder="EAAx..." value={messengerForm.pageToken} onChange={(e) => setMessengerForm({ ...messengerForm, pageToken: e.target.value })} />
              <p className="text-[10px] text-muted-foreground mt-1">Gere em: developers.facebook.com → Seu App → Messenger → Configurações</p>
            </div>
            <div className="p-3 text-xs" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}>
              Após salvar, configure o webhook da sua página apontando para:<br />
              <code className="text-[10px] font-mono">https://supabase.whatsflow.com.br/functions/v1/meta-webhook</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessengerModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveMessengerConnection} disabled={!messengerForm.pageId || !messengerForm.pageToken || savingMessenger} className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
              {savingMessenger && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ERROR ACTION CARD ───────────────────────────────────────────────────────
function ErrorActionCard({
  error,
  onRetry,
  onDismiss,
}: {
  error: OAuthError;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const config = ERROR_CARD_CONFIG[error.error_code] || {
    icon: AlertTriangle,
    title: "Erro na conexão",
    description: error.message,
    actionLabel: "Tentar Novamente",
    color: "text-rose-400",
    bgColor: "bg-rose-400/5",
    borderColor: "border-rose-400/20",
  };
  const Icon = config.icon;

  return (
    <Card className={`p-5 border ${config.borderColor} ${config.bgColor} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex gap-4">
        <div className={`shrink-0 mt-0.5 ${config.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${config.color}`}>{config.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {config.description}
          </p>

          {/* Extra details from the server (phone, WABA, etc.) */}
          {error.details && Object.keys(error.details).length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2.5 text-[11px] text-muted-foreground">
              {Object.entries(error.details).filter(([, v]) => v && v !== "—").map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="text-muted-foreground/60">{k}:</span>
                  <span className="text-foreground font-medium">{v}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <Button
              onClick={onRetry}
              size="sm"
              className="gap-1.5 h-8"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {config.actionLabel}
            </Button>
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
            >
              Dispensar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function qualityColor(rating: string | null | undefined) {
  if (!rating) return "text-muted-foreground";
  const r = rating.toUpperCase();
  if (r === "GREEN") return "text-emerald-400";
  if (r === "YELLOW") return "text-amber-400";
  return "text-rose-400";
}

function qualityLabel(rating: string | null | undefined) {
  if (!rating) return "—";
  const r = rating.toUpperCase();
  if (r === "GREEN") return "Alta";
  if (r === "YELLOW") return "Média";
  if (r === "RED") return "Baixa";
  return rating;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
}

// ─── INTEGRATION CARD ────────────────────────────────────────────────────────
function IntegrationCard({
  integration: i,
  onToggle,
  onDelete,
  onReconnect,
}: {
  integration: ChannelIntegration;
  onToggle: (i: ChannelIntegration) => void;
  onDelete: (i: ChannelIntegration) => void;
  onReconnect: () => void;
}) {
  const status = STATUS_CONFIG[i.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const isWhatsApp = i.provider === "WABA";
  const isMessenger = i.provider === "MESSENGER";
  const isInstagram = i.provider === "INSTAGRAM";
  const connectedAt = formatDate(i.created_at);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="pt-0.5">
          <ChannelIcon
            channel={isWhatsApp ? "whatsapp_meta" : isMessenger ? "facebook" : "instagram"}
            size="lg"
            variant="icon"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm truncate">{i.name}</span>
            <Badge className={`text-[10px] font-bold border ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
            {isWhatsApp && (
              <>
                {i.display_phone_number && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="text-foreground font-medium">{i.display_phone_number}</span>
                  </div>
                )}
                {i.verified_name && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="h-3 w-3 shrink-0" />
                    <span className="text-foreground font-medium">{i.verified_name}</span>
                  </div>
                )}
                {(i.waba_name || i.waba_id) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span title={i.waba_id || undefined}>{i.waba_name || `WABA ${i.waba_id}`}</span>
                  </div>
                )}
                {i.quality_rating && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className={`h-3 w-3 shrink-0 ${qualityColor(i.quality_rating)}`} />
                    <span className={qualityColor(i.quality_rating)}>Qualidade: {qualityLabel(i.quality_rating)}</span>
                  </div>
                )}
              </>
            )}
            {isInstagram && (
              <>
                {i.instagram_username && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Instagram className="h-3 w-3 shrink-0" />
                    <span className="text-foreground font-medium">@{i.instagram_username}</span>
                  </div>
                )}
                {i.facebook_page_id && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Facebook className="h-3 w-3 shrink-0" />
                    <span>Page: {i.facebook_page_id}</span>
                  </div>
                )}
              </>
            )}
            {isMessenger && (
              <>
                {i.facebook_page_id && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="h-3 w-3 shrink-0" />
                    <span>Page: {i.facebook_page_id}</span>
                  </div>
                )}
                {(i as any).page_name && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Facebook className="h-3 w-3 shrink-0" />
                    <span>{(i as any).page_name}</span>
                  </div>
                )}
              </>
            )}
            {connectedAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="h-3 w-3 shrink-0" />
                <span>Conectado em {connectedAt}</span>
              </div>
            )}
          </div>

          {i.error_message && (
            <p className="text-xs text-rose-400 mt-2">{i.error_message}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onToggle(i)} title={i.status === "active" ? "Desativar" : "Ativar"}>
            {i.status === "active"
              ? <XCircle className="h-4 w-4 text-muted-foreground" />
              : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onReconnect} title="Reconectar">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(i)} title="Remover">
            <Trash2 className="h-4 w-4 text-rose-400" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
