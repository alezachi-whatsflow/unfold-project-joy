import { useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useTenantId } from "@/hooks/useTenantId";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MOTIVOS_PERDA, type Negocio } from "@/types/vendas";

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

export default function MotivoPerdaModal({ negocio, onClose }: Props) {
  const tenantId = useTenantId();
  const { changeStatus, updateNegocio } = useNegocios(tenantId);
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!motivo) { toast.error("Selecione o motivo da perda."); return; }
    setSaving(true);
    try {
      await changeStatus(negocio, 'fechado_perdido');
      await updateNegocio(negocio.id, { motivo_perda: motivo, motivo_perda_detalhe: detalhe || null } as any);
      toast.success("Negócio fechado como perdido.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar perda.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Informe o motivo pelo qual este negócio foi perdido.</p>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_PERDA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Detalhes (opcional)</Label>
            <Textarea value={detalhe} onChange={e => setDetalhe(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={saving}>{saving ? "Salvando..." : "Confirmar Perda"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
