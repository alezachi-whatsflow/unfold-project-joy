import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotaFiscal } from "@/types/notasFiscais";

interface Props {
  nf: NotaFiscal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (nfId: string, motivo: string) => void;
}

export default function NFCancelDialog({ nf, open, onOpenChange, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");

  if (!nf) return null;

  const valid = motivo.trim().length >= 15;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm(nf.id, motivo.trim());
    setMotivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setMotivo(""); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Cancelar NF {nf.numero}</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento (mínimo 15 caracteres, conforme SEFAZ).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivo do cancelamento..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{motivo.trim().length}/15 caracteres mínimos</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setMotivo(""); onOpenChange(false); }}>Voltar</Button>
          <Button variant="destructive" disabled={!valid} onClick={handleConfirm}>Confirmar Cancelamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
