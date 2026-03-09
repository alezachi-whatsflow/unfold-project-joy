import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Unplug, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type WhatsAppInstance = {
  id: string;
  session_id: string;
  label: string;
  numero: string | null;
  provedor: "zapi" | "uazapi" | "evolution";
  status: "connected" | "qr_pending" | "disconnected";
  webhook_url: string;
  ultimo_ping: string | null;
  uso_principal: string;
};

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  connected: { emoji: "🟢", label: "Conectado", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  qr_pending: { emoji: "🟡", label: "QR Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  disconnected: { emoji: "🔴", label: "Desconectado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PROVEDOR_LABELS: Record<string, string> = { zapi: "Z-API", uazapi: "uazapi", evolution: "Evolution" };

type Props = {
  instance: WhatsAppInstance;
  onQrCode: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
};

export default function ConnectionCard({ instance, onQrCode, onDisconnect, onDelete }: Props) {
  const st = STATUS_CONFIG[instance.status];

  const copySessionId = () => {
    navigator.clipboard.writeText(instance.session_id);
    toast.success("Session ID copiado!");
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">{st.emoji}</span>
              <span className="font-semibold text-sm">{instance.label}</span>
            </div>
            {instance.numero && <p className="text-xs text-muted-foreground">{instance.numero}</p>}
          </div>
          <Badge variant="outline" className={st.color}>{st.label}</Badge>
        </div>

        {/* Info */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Provedor</span>
            <Badge variant="secondary" className="text-[10px]">{PROVEDOR_LABELS[instance.provedor]}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Session ID</span>
            <button onClick={copySessionId} className="flex items-center gap-1 font-mono text-[10px] hover:text-foreground transition-colors">
              {instance.session_id} <Copy className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Último ping</span>
            <span>
              {instance.ultimo_ping
                ? formatDistanceToNow(new Date(instance.ultimo_ping), { addSuffix: true, locale: ptBR })
                : "—"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={instance.status === "qr_pending" ? "default" : "outline"}
            className={instance.status === "qr_pending" ? "bg-emerald-600 hover:bg-emerald-700 flex-1" : "flex-1"}
            onClick={onQrCode}
          >
            <QrCode className="h-3.5 w-3.5 mr-1" /> QR Code
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onDisconnect} disabled={instance.status === "disconnected"}>
            <Unplug className="h-3.5 w-3.5 mr-1" /> Desconectar
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
