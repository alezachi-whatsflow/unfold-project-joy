import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Customer } from "@/types/customers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Customer) => Promise<void>;
  editing?: Customer | null;
}

const emptyForm: Omit<Customer, "id"> = {
  whitelabel: "",
  nome: "",
  email: "",
  status: "Ativo",
  dataAtivacao: new Date().toISOString().split("T")[0],
  dataCancelado: null,
  dataBloqueio: null,
  dataDesbloqueio: null,
  dataVencimento: null,
  dispositivosOficial: 0,
  dispositivosNaoOficial: 0,
  atendentes: 0,
  adicional: 0,
  checkout: "",
  receita: "",
  tipoPagamento: "",
  condicao: "",
  valorUltimaCobranca: 0,
};

export function CustomerFormDialog({ open, onOpenChange, onSave, editing }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      const { id, ...rest } = editing;
      setForm(rest);
    } else {
      setForm({ ...emptyForm, dataAtivacao: new Date().toISOString().split("T")[0] });
    }
  }, [editing, open]);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editing?.id || crypto.randomUUID(),
        ...form,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa / Titular *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Whitelabel</Label>
              <Input value={form.whitelabel} onChange={(e) => set("whitelabel", e.target.value)} placeholder="Whitelabel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Condição</Label>
              <Input value={form.condicao} onChange={(e) => set("condicao", e.target.value)} placeholder="Ex: Mensal" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Data Ativação</Label>
              <Input type="date" value={form.dataAtivacao || ""} onChange={(e) => set("dataAtivacao", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Cancelado</Label>
              <Input type="date" value={form.dataCancelado || ""} onChange={(e) => set("dataCancelado", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Bloqueio</Label>
              <Input type="date" value={form.dataBloqueio || ""} onChange={(e) => set("dataBloqueio", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Desbloqueio</Label>
              <Input type="date" value={form.dataDesbloqueio || ""} onChange={(e) => set("dataDesbloqueio", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Vencimento</Label>
              <Input type="date" value={form.dataVencimento || ""} onChange={(e) => set("dataVencimento", e.target.value || null)} />
            </div>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Disp. Oficial</Label>
              <Input type="number" min={0} value={form.dispositivosOficial} onChange={(e) => set("dispositivosOficial", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disp. Não Oficial</Label>
              <Input type="number" min={0} value={form.dispositivosNaoOficial} onChange={(e) => set("dispositivosNaoOficial", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Atendentes</Label>
              <Input type="number" min={0} value={form.atendentes} onChange={(e) => set("atendentes", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Adicional</Label>
              <Input type="number" min={0} value={form.adicional} onChange={(e) => set("adicional", Number(e.target.value))} />
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Checkout</Label>
              <Input value={form.checkout} onChange={(e) => set("checkout", e.target.value)} placeholder="Ex: Asaas" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Receita</Label>
              <Input value={form.receita} onChange={(e) => set("receita", e.target.value)} placeholder="Tipo receita" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo Pagamento</Label>
              <Input value={form.tipoPagamento} onChange={(e) => set("tipoPagamento", e.target.value)} placeholder="Ex: Boleto" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Cobrança (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.valorUltimaCobranca} onChange={(e) => set("valorUltimaCobranca", Number(e.target.value))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim() || !form.email.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
