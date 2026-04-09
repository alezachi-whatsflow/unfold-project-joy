import { fmtDate, fmtDateTime } from "@/lib/dateUtils";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QrCode, Unplug, Trash2, Zap, Shield, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { instanceService } from "@/services/instanceService";
import ChatbotSettingsModal from "./ChatbotSettingsModal";
import PrivacySettingsModal from "./PrivacySettingsModal";

export type UazapiInstance = {
  id: string;
  instance_name: string;
  instance_token: string;
  status: string;
  qr_code: string | null;
  pair_code: string | null;
  profile_name: string | null;
  profile_pic_url: string | null;
  phone_number: string | null;
  is_business: boolean;
  platform: string | null;
  current_presence: string;
  chatbot_enabled: boolean;
  chatbot_ignore_groups: boolean;
  chatbot_stop_keyword: string;
  chatbot_stop_minutes: number;
  chatbot_stop_when_send: number;
  webhook_url: string;
  ultimo_ping: string | null;
  last_disconnect: string | null;
  last_disconnect_reason: string | null;
  api_created_at: string | null;
  api_updated_at: string | null;
  criado_em: string | null;
  label: string;
  session_id: string;
  provedor: string;
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  connected: { label: "Conectado", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  disconnected: { label: "Desconectado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  connecting: { label: "Conectando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  qr_pending: { label: "QR Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

type Props = {
  instance: UazapiInstance;
  onConnect: () => void;
  onRefresh: () => void;
  onDelete: () => void;
};

export default function InstanceCard({ instance, onConnect, onRefresh, onDelete }: Props) {
  const st = STATUS_BADGE[instance.status] || STATUS_BADGE.disconnected;
  const isConnected = instance.status === "connected";
  const isOnline = instance.current_presence === "available";
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await instanceService.disconnect(instance.instance_name);
      await supabase.from("whatsapp_instances").update({ status: "disconnected" }).eq("id", instance.id);
      toast.success("Desconectado!");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Erro desconhecido"));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir "${instance.label || instance.instance_name}"?\n\nIsso removerá o dispositivo, todas as mensagens e arquivos de mídia. Esta ação não pode ser desfeita.`)) return;
    try {
      await instanceService.delete(instance.instance_name);
      toast.success("Instância excluída!");
      onDelete();
    } catch {
      await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      toast.success("Instância removida.");
      onDelete();
    }
  };

  const handleSyncMessages = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("sync-uazapi-messages", {
        body: { instance_name: instance.instance_name },
      });
      toast.success("Sincronizando mensagens do dispositivo...");
    } catch {
      toast.error("Erro ao sincronizar mensagens");
    } finally {
      setSyncing(false);
    }
  };

  // Timestamps
  const createdAt = instance.criado_em || instance.api_created_at;
  const createdAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })
    : null;
  const connectedAgo = isConnected && instance.ultimo_ping
    ? formatDistanceToNow(new Date(instance.ultimo_ping), { addSuffix: true, locale: ptBR })
    : null;
  const disconnectedAgo = !isConnected && instance.last_disconnect
    ? formatDistanceToNow(new Date(instance.last_disconnect), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <>
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-4 space-y-3">

          {/* ── Row 1: Name + Status Badge + Online dot (14) ── */}
          <div className="flex items-center gap-3">
            {/* (14) Status dot: green=online, red=offline */}
            <div className={`w-3 h-3 rounded-full shrink-0 ${isConnected && isOnline ? "bg-emerald-500" : isConnected ? "bg-amber-500" : "bg-red-500"}`} />

            {/* (3) Full device name */}
            <span className="text-sm font-semibold truncate flex-1">
              {instance.label || instance.instance_name}
            </span>

            {instance.is_business && <Badge variant="secondary" className="text-[8px] px-1">Biz</Badge>}

            {/* (4) Connection status badge */}
            <Badge variant="outline" className={`text-[10px] shrink-0 ${st.color}`}>{st.label}</Badge>
          </div>

          {/* ── Row 2: Timestamps (5, 7, 13) ── */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            {/* (14) Online/Offline status */}
            <span className={isConnected && isOnline ? "text-emerald-400" : "text-muted-foreground"}>
              {isConnected && isOnline ? "🟢 Online" : isConnected ? "🟡 Inativo" : "🔴 Offline"}
            </span>

            {/* (5) Time since creation */}
            {createdAgo && <span>Criado {createdAgo}</span>}

            {/* (13) Time connected/disconnected */}
            {connectedAgo && (
              <span className="text-emerald-400">✅ Conectado {connectedAgo}</span>
            )}
            {disconnectedAgo && (
              <span className="text-red-400">⚠️ Desconectado {disconnectedAgo}</span>
            )}
          </div>

          {/* ── Row 3: Creation date (7) + Automation status (6) ── */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            {/* (7) Creation date */}
            {createdAt && <span>📅 Criado: {fmtDateTime(createdAt)}</span>}

            {/* (6) Automation/chatbot status */}
            <span className={instance.chatbot_enabled ? "text-primary" : ""}>
              {instance.chatbot_enabled ? "⚡ Automação ativa" : "⚡ Sem automação"}
            </span>

            {/* Phone number if available */}
            {instance.phone_number && <span>📱 {instance.phone_number}</span>}
          </div>

          {/* ── Row 4: Action buttons ── */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
            {/* Connect button (only when disconnected) */}
            {(instance.status === "disconnected" || instance.status === "qr_pending") && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs" onClick={onConnect}>
                <QrCode className="h-3.5 w-3.5" /> Conectar
              </Button>
            )}
            {instance.status === "connecting" && (
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onConnect}>
                <QrCode className="h-3.5 w-3.5" /> Ver QR
              </Button>
            )}

            {/* (12) Disconnect — icon button when connected */}
            {isConnected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Desconectar dispositivo</TooltipContent>
              </Tooltip>
            )}

            {/* (11) Privacy settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowPrivacy(true)}>
                  <Shield className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Privacidade</TooltipContent>
            </Tooltip>

            {/* (10) Sync messages from device */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSyncMessages} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Sincronizar mensagens</TooltipContent>
            </Tooltip>

            {/* (8) Automation settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${instance.chatbot_enabled ? "text-primary" : ""}`} onClick={() => setShowChatbot(true)}>
                  <Zap className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Automação</TooltipContent>
            </Tooltip>

            {/* (9) Delete instance */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive ml-auto" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Excluir dispositivo</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <ChatbotSettingsModal
        open={showChatbot}
        instanceName={instance.instance_name}
        initialSettings={{
          chatbot_enabled: instance.chatbot_enabled,
          chatbot_ignore_groups: instance.chatbot_ignore_groups,
          chatbot_stop_keyword: instance.chatbot_stop_keyword,
          chatbot_stop_minutes: instance.chatbot_stop_minutes,
          chatbot_stop_when_send: instance.chatbot_stop_when_send,
        }}
        onClose={() => setShowChatbot(false)}
        onSaved={onRefresh}
      />
      <PrivacySettingsModal
        open={showPrivacy}
        instanceName={instance.instance_name}
        onClose={() => setShowPrivacy(false)}
      />
    </>
  );
}
