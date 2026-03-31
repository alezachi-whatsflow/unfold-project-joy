import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { instanceService } from "@/services/instanceService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  instanceName: string;
  initialSettings?: {
    chatbot_enabled?: boolean;
    chatbot_ignore_groups?: boolean;
    chatbot_stop_keyword?: string;
    chatbot_stop_minutes?: number;
    chatbot_stop_when_send?: number;
  };
  onClose: () => void;
  onSaved?: () => void;
};

export default function ChatbotSettingsModal({ open, instanceName, initialSettings, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(initialSettings?.chatbot_enabled ?? false);
  const [ignoreGroups, setIgnoreGroups] = useState(initialSettings?.chatbot_ignore_groups ?? true);
  const [stopKeyword, setStopKeyword] = useState(initialSettings?.chatbot_stop_keyword ?? "parar");
  const [stopMinutes, setStopMinutes] = useState(initialSettings?.chatbot_stop_minutes ?? 60);
  const [stopWhenSend, setStopWhenSend] = useState(initialSettings?.chatbot_stop_when_send ?? 0);
  const [apiKey, setApiKey] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      await instanceService.updateChatbotSettings(instanceName, {
        chatbot_enabled: enabled,
        chatbot_ignoreGroups: ignoreGroups,
        chatbot_stopConversation: stopKeyword,
        chatbot_stopMinutes: stopMinutes,
        chatbot_stopWhenYouSendMsg: stopWhenSend,
        openai_apikey: apiKey || undefined,
      });
      toast.success("Configurações do chatbot salvas!");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Chatbot</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between">
            <Label>Ativar Chatbot</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ignorar Grupos</Label>
            <Switch checked={ignoreGroups} onCheckedChange={setIgnoreGroups} />
          </div>
          <div className="space-y-1.5">
            <Label>Palavra para pausar</Label>
            <Input value={stopKeyword} onChange={(e) => setStopKeyword(e.target.value)} placeholder="parar" />
          </div>
          <div className="space-y-1.5">
            <Label>Minutos de pausa após palavra-chave</Label>
            <Input type="number" value={stopMinutes} onChange={(e) => setStopMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Minutos de pausa ao enviar mensagem manual (0 = desligado)</Label>
            <Input type="number" value={stopWhenSend} onChange={(e) => setStopWhenSend(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>OpenAI API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
