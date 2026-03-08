import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  cpfCnpj: "",
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
          {/* Row 1: Nome + Email */}
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

          {/* Row 2: CPF/CNPJ + Whitelabel + Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">CPF / CNPJ</Label>
              <Input value={form.cpfCnpj} onChange={(e) => set("cpfCnpj", e.target.value)} placeholder="000.000.000-00" />
            </div>
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
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "dataAtivacao", label: "Data Ativação" },
              { key: "dataCancelado", label: "Data Cancelado" },
              { key: "dataBloqueio", label: "Data Bloqueio" },
              { key: "dataDesbloqueio", label: "Data Desbloqueio" },
              { key: "dataVencimento", label: "Data Vencimento" },
            ].map(({ key, label }) => {
              const value = (form as any)[key];
              const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
              const isValidDate = dateValue && !isNaN(dateValue.getTime());
              return (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !isValidDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isValidDate ? format(dateValue, "dd/MM/yyyy") : "dd/mm/aaaa"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={isValidDate ? dateValue : undefined}
                        onSelect={(d) => set(key, d ? format(d, "yyyy-MM-dd") : null)}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}
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

          {/* Financial with Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Checkout</Label>
              <Select value={form.checkout || "_empty"} onValueChange={(v) => set("checkout", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Nenhum</SelectItem>
                  <SelectItem value="Asaas">Asaas</SelectItem>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                  <SelectItem value="PagSeguro">PagSeguro</SelectItem>
                  <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Receita</Label>
              <Select value={form.receita || "_empty"} onValueChange={(v) => set("receita", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Nenhum</SelectItem>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="avulsa">Avulsa</SelectItem>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo Pagamento</Label>
              <Select value={form.tipoPagamento || "_empty"} onValueChange={(v) => set("tipoPagamento", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Nenhum</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Cobrança (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.valorUltimaCobranca} onChange={(e) => set("valorUltimaCobranca", Number(e.target.value))} />
            </div>
          </div>

          {/* Condição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Condição</Label>
              <Select value={form.condicao || "_empty"} onValueChange={(v) => set("condicao", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">Nenhum</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>
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
