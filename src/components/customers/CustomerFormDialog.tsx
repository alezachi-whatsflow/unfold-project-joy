import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Camera, Upload, Sparkles, CheckCircle2 } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Customer } from "@/types/customers";
import { CnpjInput } from "@/components/ui/cnpj-input";

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
  phoneBilling: "",
  phoneLead: "",
  phoneCompany: "",
};

export function CustomerFormDialog({ open, onOpenChange, onSave, editing }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      const { id, ...rest } = editing;
      setForm(rest);
    } else {
      setForm({ ...emptyForm, dataAtivacao: new Date().toISOString().split("T")[0] });
    }
    setOcrDone(false);
  }, [editing, open]);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  // OCR: extract customer data from image
  const handleOcrUpload = async (file: File) => {
    if (!file) return;
    setExtracting(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:image/...;base64,
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-customer-ocr", {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const d = data?.data;
      if (d) {
        // Map extracted fields to form
        if (d.nome) set("nome", d.nome);
        if (d.email) set("email", d.email);
        if (d.cpf_cnpj) set("cpfCnpj", d.cpf_cnpj);
        if (d.telefone) set("phoneLead", d.telefone);
        if (d.responsavel) set("phoneCompany", ""); // Will be used for dynamic
        setOcrDone(true);
        toast.success(`Dados extraídos com ${d.confidence || "?"}% de confiança`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao extrair dados da imagem");
    } finally {
      setExtracting(false);
    }
  };

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
          {/* OCR Import — only for new customers */}
          {!editing && (
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-dashed transition-colors cursor-pointer",
                extracting ? "border-primary/50 bg-primary/5" : ocrDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
              onClick={() => !extracting && ocrInputRef.current?.click()}
            >
              <input
                ref={ocrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleOcrUpload(file);
                  e.target.value = "";
                }}
              />
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {extracting ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : ocrDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Camera className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {extracting ? "Extraindo dados..." : ocrDone ? "Dados extraídos com sucesso!" : "Importar de imagem (OCR)"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {extracting ? "Analisando documento com IA..." : ocrDone ? "Revise os campos preenchidos abaixo" : "Envie foto do cartão CNPJ, certificado MEI ou cartão de visitas"}
                </p>
              </div>
              {!extracting && !ocrDone && <Upload className="h-4 w-4 text-muted-foreground shrink-0" />}
              {ocrDone && <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />}
            </div>
          )}

          {/* Row 1: Nome + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">CPF / CNPJ</Label>
              <CnpjInput value={form.cpfCnpj} onChange={(v) => set("cpfCnpj", v)} />
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

          {/* Telefones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone Faturamento</Label>
              <Input value={form.phoneBilling} onChange={(e) => set("phoneBilling", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone Lead</Label>
              <Input value={form.phoneLead} onChange={(e) => set("phoneLead", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone Empresa</Label>
              <Input value={form.phoneCompany} onChange={(e) => set("phoneCompany", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          {/* Condição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
