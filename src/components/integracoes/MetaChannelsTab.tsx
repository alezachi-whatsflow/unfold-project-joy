import { useState } from "react";
import { useChannelIntegrations, type ChannelIntegration } from "@/hooks/useChannelIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, MessageSquare, Instagram, CheckCircle2, XCircle, Clock, Trash2, RefreshCw, ExternalLink, Phone, Hash, Facebook } from "lucide-react";
import { ChannelIcon } from "@/components/ui/ChannelIcon";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Ativo", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  inactive: { label: "Inativo", color: "text-muted-foreground bg-muted/50 border-border", icon: XCircle },
  error: { label: "Erro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
};

export default function MetaChannelsTab() {
  const { data: integrations = [], isLoading, tenantId, invalidate } = useChannelIntegrations();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [messengerModalOpen, setMessengerModalOpen] = useState(false);
  const [messengerForm, setMessengerForm] = useState({ pageId: "", pageToken: "", pageName: "" });
  const [savingMessenger, setSavingMessenger] = useState(false);

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
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
        body: { provider, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error("URL de autorização não retornada");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar conexão");
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

        {whatsappIntegrations.length === 0 ? (
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

        {instagramIntegrations.length === 0 ? (
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
            <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}>
              Após salvar, configure o webhook da sua página apontando para:<br />
              <code className="text-[10px] font-mono">https://jtlrglzcsmqmapizqgzu.supabase.co/functions/v1/meta-webhook</code>
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

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <ChannelIcon
          channel={isWhatsApp ? "whatsapp_meta" : isMessenger ? "facebook" : "instagram"}
          size="lg"
          variant="icon"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{i.name}</span>
            <Badge className={`text-[10px] font-bold border ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            {isWhatsApp ? (
              <>
                {i.display_phone_number && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {i.display_phone_number}</span>
                )}
                {i.phone_number_id && (
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {i.phone_number_id}</span>
                )}
                {i.waba_id && (
                  <span className="flex items-center gap-1">WABA: {i.waba_id}</span>
                )}
              </>
            ) : isMessenger ? (
              <>
                {i.facebook_page_id && (
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Page: {i.facebook_page_id}</span>
                )}
                {(i as any).page_name && (
                  <span className="flex items-center gap-1">{(i as any).page_name}</span>
                )}
              </>
            ) : (
              <>
                {i.instagram_username && (
                  <span className="flex items-center gap-1">@{i.instagram_username}</span>
                )}
                {i.facebook_page_id && (
                  <span className="flex items-center gap-1">Page: {i.facebook_page_id}</span>
                )}
              </>
            )}
          </div>
          {i.error_message && (
            <p className="text-xs text-rose-400 mt-1">{i.error_message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
