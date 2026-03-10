import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { WhatsAppInstance } from "./ConnectionCard";

type SavePayload = WhatsAppInstance & { token_api?: string; server_url?: string; instance_id_api?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (inst: SavePayload) => void;
};

const PROVEDOR_TOKEN_LABELS: Record<string, string> = {
  zapi: "Instance ID / Token Z-API",
  uazapi: "Token uazapi",
  evolution: "Instance Name / API Key",
};

const USO_OPTIONS = [
  { value: "suporte", label: "Suporte ao cliente" },
  { value: "prospeccao", label: "Prospecção de leads" },
  { value: "cobranca", label: "Régua de cobrança" },
  { value: "massa", label: "Envios em massa" },
];

export default function NewConnectionModal({ open, onClose, onSave }: Props) {
  const [label, setLabel] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [provedor, setProvedor] = useState<"zapi" | "uazapi" | "evolution">("zapi");
  const [token, setToken] = useState("");
  const [instanceIdApi, setInstanceIdApi] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [uso, setUso] = useState("suporte");

  // Auto-generate a unique session ID when the modal opens
  useEffect(() => {
    if (open) {
      const uid = crypto.randomUUID().slice(0, 8);
      const ts = Date.now().toString(36);
      setSessionId(`sess-${ts}-${uid}`);
    }
  }, [open]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "knnwgijcrpbgqhdzmdrp";
  const webhookUrl = sessionId ? `https://${projectId}.supabase.co/functions/v1/whatsapp-webhook-receiver/${sessionId}/${provedor}` : "";

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copiado!");
    }
  };

  const handleSave = () => {
    if (!label.trim() || !token.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const inst: SavePayload = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      label: label.trim(),
      numero: null,
      provedor,
      status: "qr_pending",
      webhook_url: webhookUrl,
      ultimo_ping: null,
      uso_principal: uso,
      token_api: token,
      instance_id_api: provedor === "zapi" ? instanceIdApi : sessionId,
      server_url: provedor === "evolution" ? serverUrl : undefined,
    };
    onSave(inst);
    resetForm();
  };

  const resetForm = () => {
    setLabel("");
    setSessionId("");
    setProvedor("zapi");
    setToken("");
    setInstanceIdApi("");
    setServerUrl("");
    setUso("suporte");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Label da Conexão</Label>
            <Input placeholder="Ex: Cobrança - Pioneira" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Session ID <span className="text-muted-foreground text-[10px]">(gerado automaticamente)</span></Label>
            <Input value={sessionId} readOnly className="font-mono text-xs bg-muted/50" />
          </div>

          <div className="space-y-1.5">
            <Label>Provedor de API</Label>
            <Select value={provedor} onValueChange={(v) => setProvedor(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zapi">Z-API</SelectItem>
                <SelectItem value="uazapi">uazapi</SelectItem>
                <SelectItem value="evolution">Evolution API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provedor === "zapi" && (
            <div className="space-y-1.5">
              <Label>Instance ID (Z-API)</Label>
              <Input placeholder="Cole o Instance ID" value={instanceIdApi} onChange={(e) => setInstanceIdApi(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{PROVEDOR_TOKEN_LABELS[provedor]}</Label>
            <Input placeholder="Cole aqui o token/API Key" value={token} onChange={(e) => setToken(e.target.value)} type="password" />
          </div>

          {provedor === "evolution" && (
            <div className="space-y-1.5">
              <Label>URL do Servidor</Label>
              <Input placeholder="https://evolution.seudominio.com" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
              <Button variant="outline" size="icon" onClick={copyWebhook} disabled={!webhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Configure este URL no painel do provedor para receber mensagens.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Uso Principal</Label>
            <Select value={uso} onValueChange={setUso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {USO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Salvar e Conectar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
