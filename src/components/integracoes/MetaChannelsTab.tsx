import { useState } from "react";
import { useChannelIntegrations, type ChannelIntegration } from "@/hooks/useChannelIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MessageSquare, Instagram, CheckCircle2, XCircle, Clock, Trash2, RefreshCw, ExternalLink, Phone, Hash } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Ativo", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  inactive: { label: "Inativo", color: "text-muted-foreground bg-muted/50 border-border", icon: XCircle },
  error: { label: "Erro", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
};

export default function MetaChannelsTab() {
  const { data: integrations = [], isLoading, tenantId, invalidate } = useChannelIntegrations();
  const [connecting, setConnecting] = useState<string | null>(null);

  const whatsappIntegrations = integrations.filter(i => i.provider === "WABA");
  const instagramIntegrations = integrations.filter(i => i.provider === "INSTAGRAM");

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
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">WhatsApp API Oficial</h2>
              <p className="text-xs text-muted-foreground">Integração via Meta Business — envie e receba mensagens pela API oficial</p>
            </div>
          </div>
          <Button
            onClick={() => startOAuth("WABA")}
            disabled={connecting === "WABA"}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {connecting === "WABA" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
            Conectar WhatsApp
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-pink-400" />
            </div>
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

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWhatsApp ? "bg-[#25D366]/10" : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"}`}>
          {isWhatsApp
            ? <MessageSquare className="h-5 w-5 text-[#25D366]" />
            : <Instagram className="h-5 w-5 text-pink-400" />}
        </div>

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
