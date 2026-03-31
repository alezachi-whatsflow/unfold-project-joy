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
  webhook_url: string;
  ultimo_ping: string | null;
  last_disconnect: string | null;
  last_disconnect_reason: string | null;
  api_created_at: string | null;
  api_updated_at: string | null;
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
      <Card style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 10, overflow: "hidden" }}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: instance.status === "connected" ? "rgba(14,138,92,0.1)" : "var(--border)",
            }}>
              {instance.profile_pic_url ? (
                <img src={instance.profile_pic_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 16 }}>{st.emoji}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">
                  {instance.profile_name || instance.label || instance.instance_name}
                </span>
                {instance.is_business && <Badge variant="secondary" className="text-[8px] px-1">Biz</Badge>}
              </div>
              {instance.phone_number && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>📱 {instance.phone_number}</p>
              )}
            </div>
            <Badge variant="outline" className={st.color} style={{ fontSize: 10, flexShrink: 0 }}>{st.label}</Badge>
          </div>

          {/* Compact info row */}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-secondary)", flexWrap: "wrap" }}>
            <span>{instance.current_presence === "available" ? "🟢 Online" : "⚪ Offline"}</span>
            <span>{instance.chatbot_enabled ? "🤖 Bot ativo" : "🤖 Inativo"}</span>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
              {instance.ultimo_ping
                ? formatDistanceToNow(new Date(instance.ultimo_ping), { addSuffix: true, locale: ptBR })
                : "—"}
            </span>
          </div>

          {/* Connection/Disconnection info */}
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-muted)", flexWrap: "wrap" }}>
            {instance.api_created_at && (
              <span>📅 Criado: {new Date(instance.api_created_at).toLocaleDateString("pt-BR")}</span>
            )}
            {instance.status === "connected" && instance.ultimo_ping && (
              <span style={{ color: "var(--inbox-active-color, #0E8A5C)" }}>
                ✅ Conectado {formatDistanceToNow(new Date(instance.ultimo_ping), { addSuffix: true, locale: ptBR })}
              </span>
            )}
            {instance.last_disconnect && (
              <span style={{ color: instance.status === "disconnected" ? "#ef4444" : "var(--text-muted)" }}>
                ⚠️ Última desconexão: {new Date(instance.last_disconnect).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {instance.last_disconnect_reason && ` (${instance.last_disconnect_reason})`}
              </span>
            )}
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
