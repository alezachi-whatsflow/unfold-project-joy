import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LC116_SERVICES, type MunicipalISS } from "@/lib/taxData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: MunicipalISS) => void;
  editEntry?: MunicipalISS | null;
}

export default function MunicipalFormDialog({ open, onOpenChange, onSave, editEntry }: Props) {
  const [municipio, setMunicipio] = useState("");
  const [codigoIBGE, setCodigoIBGE] = useState("");
  const [aliquotaISS, setAliquotaISS] = useState(5);
  const [servicoLC116, setServicoLC116] = useState(LC116_SERVICES[0]);
  const [issRetido, setIssRetido] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (editEntry) {
      setMunicipio(editEntry.municipio);
      setCodigoIBGE(editEntry.codigoIBGE);
      setAliquotaISS(editEntry.aliquotaISS);
      setServicoLC116(editEntry.servicoLC116);
      setIssRetido(editEntry.issRetido);
      setObservacoes(editEntry.observacoes);
    } else {
      setMunicipio(""); setCodigoIBGE(""); setAliquotaISS(5);
      setServicoLC116(LC116_SERVICES[0]); setIssRetido(false); setObservacoes("");
    }
  }, [editEntry, open]);

  const handleSave = () => {
    onSave({
      id: editEntry?.id || crypto.randomUUID(),
      municipio, codigoIBGE, aliquotaISS, servicoLC116, issRetido, observacoes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEntry ? "Editar Município" : "Adicionar Município"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Município</Label>
              <Input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="space-y-1.5">
              <Label>Código IBGE</Label>
              <Input value={codigoIBGE} onChange={e => setCodigoIBGE(e.target.value)} placeholder="3550308" maxLength={7} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Alíquota ISS (%)</Label>
              <Input type="number" step="any" min={0} max={10} value={aliquotaISS} onChange={e => setAliquotaISS(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Serviço (LC 116)</Label>
              <Select value={servicoLC116} onValueChange={setServicoLC116}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LC116_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={issRetido} onCheckedChange={setIssRetido} />
            <Label>ISS Retido na Fonte</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!municipio || !codigoIBGE}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
