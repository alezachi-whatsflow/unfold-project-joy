import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { instanceService } from "@/services/instanceService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  instanceName: string;
  onClose: () => void;
};

const OPTIONS_3 = [
  { value: "all", label: "Todos" },
  { value: "contacts", label: "Somente contatos" },
  { value: "none", label: "Ninguém" },
];

const OPTIONS_2_READ = [
  { value: "all", label: "Ativado" },
  { value: "none", label: "Desativado" },
];

const OPTIONS_2_ONLINE = [
  { value: "all", label: "Todos" },
  { value: "match_last_seen", label: "Igual ao visto por último" },
];

export default function PrivacySettingsModal({ open, instanceName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    groupadd: "all",
    last: "all",
    status: "all",
    profile: "all",
    readreceipts: "all",
    online: "all",
  });

  useEffect(() => {
    if (open && instanceName) {
      setLoading(true);
      instanceService.getPrivacy(instanceName).then((data: any) => {
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [open, instanceName]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await instanceService.updatePrivacy(instanceName, settings as any);
      toast.success("Privacidade atualizada!");
      onClose();
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "last", label: "Visto por último", options: OPTIONS_3 },
    { key: "profile", label: "Foto do perfil", options: OPTIONS_3 },
    { key: "status", label: "Status/Recado", options: OPTIONS_3 },
    { key: "groupadd", label: "Adicionar a grupos", options: OPTIONS_3 },
    { key: "readreceipts", label: "Confirmação de leitura", options: OPTIONS_2_READ },
    { key: "online", label: "Online", options: OPTIONS_2_ONLINE },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Privacidade</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Select
                  value={(settings as any)[f.key]}
                  onValueChange={(v) => setSettings((prev) => ({ ...prev, [f.key]: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
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
