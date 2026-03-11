import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Unplug, Trash2, Bot, Shield, Settings, RefreshCw, Loader2 } from "lucide-react";
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
  openai_apikey: string | null;
  webhook_url: string;
  ultimo_ping: string | null;
  label: string;
  session_id: string;
  provedor: string;
};

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  connected: { emoji: "🔵", label: "Conectado", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  disconnected: { emoji: "🔴", label: "Desconectado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  connecting: { emoji: "🟡", label: "Conectando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  qr_pending: { emoji: "🟡", label: "QR Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

type Props = {
  instance: UazapiInstance;
  onConnect: () => void;
  onRefresh: () => void;
  onDelete: () => void;
};

export default function InstanceCard({ instance, onConnect, onRefresh, onDelete }: Props) {
  const st = STATUS_CONFIG[instance.status] || STATUS_CONFIG.disconnected;
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
    if (!confirm("Tem certeza que deseja excluir esta instância?")) return;
    try {
      await instanceService.delete(instance.instance_name);
      toast.success("Instância excluída!");
      onDelete();
    } catch (err: any) {
      // Fallback: delete from local DB only
      await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      toast.success("Instância removida do sistema.");
      onDelete();
    }
  };

  return (
    <>
      <Card className="border-border/60 bg-card">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {instance.profile_pic_url ? (
                  <img src={instance.profile_pic_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="text-base">{st.emoji}</span>
                )}
                <div>
                  <span className="font-semibold text-sm">{instance.profile_name || instance.label || instance.instance_name}</span>
                  {instance.is_business && <Badge variant="secondary" className="ml-1 text-[9px]">Business</Badge>}
                </div>
              </div>
              {instance.phone_number && <p className="text-xs text-muted-foreground">📱 {instance.phone_number}</p>}
            </div>
            <Badge variant="outline" className={st.color}>{st.label}</Badge>
          </div>

          {/* Info */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Instância</span>
              <span className="font-mono text-[10px]">{instance.instance_name}</span>
            </div>
            {instance.platform && (
              <div className="flex justify-between">
                <span>Plataforma</span>
                <span>{instance.platform}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Presença</span>
              <span>{instance.current_presence === "available" ? "🟢 Online" : "⚪ Offline"}</span>
            </div>
            <div className="flex justify-between">
              <span>Chatbot</span>
              <span>{instance.chatbot_enabled ? "✅ Ativo" : "❌ Inativo"}</span>
            </div>
            <div className="flex justify-between">
              <span>Último ping</span>
              <span>
                {instance.ultimo_ping
                  ? formatDistanceToNow(new Date(instance.ultimo_ping), { addSuffix: true, locale: ptBR })
                  : "—"}
              </span>
            </div>
          </div>

          {/* Actions by status */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(instance.status === "disconnected" || instance.status === "qr_pending") && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={onConnect}>
                <QrCode className="h-3.5 w-3.5 mr-1" /> Conectar
              </Button>
            )}
            {instance.status === "connecting" && (
              <Button size="sm" variant="outline" className="flex-1" onClick={onConnect}>
                <QrCode className="h-3.5 w-3.5 mr-1" /> Ver QR
              </Button>
            )}
            {instance.status === "connected" && (
              <>
                <Button size="sm" variant="outline" className="flex-1" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Unplug className="h-3.5 w-3.5 mr-1" />}
                  Desconectar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowChatbot(true)}>
                  <Bot className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPrivacy(true)}>
                  <Shield className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
          openai_apikey: instance.openai_apikey || undefined,
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
