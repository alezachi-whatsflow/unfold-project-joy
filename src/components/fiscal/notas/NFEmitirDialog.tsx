import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { NFItem, NFTipo, NFTributos, NotaFiscal, NFFormDestinatario } from "@/types/notasFiscais";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmit: (nf: Omit<NotaFiscal, "id" | "numero" | "dataEmissao">) => void;
  nextNumero: string;
}

const emptyItem = (): NFItem => ({ id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnitario: 0, codigoServico: "1.01", aliquotaISS: 5 });

export default function NFEmitirDialog({ open, onOpenChange, onEmit, nextNumero }: Props) {
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<NFTipo>("NFS-e");
  const [dest, setDest] = useState<NFFormDestinatario>({ nome: "", cpfCnpj: "", email: "", endereco: "" });
  const [itens, setItens] = useState<NFItem[]>([emptyItem()]);
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const totalBruto = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);

  const calcTributos = (): NFTributos => {
    const avgISS = itens.length > 0 ? itens.reduce((s, i) => s + i.aliquotaISS, 0) / itens.length : 5;
    const issValor = totalBruto * (avgISS / 100);
    const pisPercent = 0.65;
    const cofinsPercent = 3;
    const pisValor = totalBruto * (pisPercent / 100);
    const cofinsValor = totalBruto * (cofinsPercent / 100);
    const totalImpostos = issValor + pisValor + cofinsValor;
    return {
      issPercent: avgISS, issValor,
      pisPercent, pisValor,
      cofinsPercent, cofinsValor,
      irpjPercent: 0, irpjValor: 0,
      csllPercent: 0, csllValor: 0,
      totalBruto, totalImpostos,
      totalLiquido: totalBruto - totalImpostos,
    };
  };

  const tributos = calcTributos();

  const updateItem = (idx: number, patch: Partial<NFItem>) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const canNext = () => {
    if (step === 1) return dest.nome.trim().length > 0 && dest.cpfCnpj.trim().length >= 11;
    if (step === 2) return itens.every((i) => i.descricao.trim() && i.valorUnitario > 0);
    return true;
  };

  const handleEmit = () => {
    setLoading(true);
    setTimeout(() => {
      onEmit({
        tipo,
        clienteNome: dest.nome,
        clienteCpfCnpj: dest.cpfCnpj,
        clienteEmail: dest.email,
        clienteEndereco: dest.endereco,
        valor: totalBruto,
        impostos: tributos.totalImpostos,
        status: "emitida",
        itens,
        tributos,
        observacoes: obs,
      });
      setLoading(false);
      reset();
      onOpenChange(false);
      toast.success("✅ Nota Fiscal emitida com sucesso!", { description: `NF nº ${nextNumero} autorizada.` });
    }, 1500);
  };

  const reset = () => {
    setStep(1);
    setTipo("NFS-e");
    setDest({ nome: "", cpfCnpj: "", email: "", endereco: "" });
    setItens([emptyItem()]);
    setObs("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Nota Fiscal — NF {nextNumero}</DialogTitle>
          <DialogDescription>
            <div className="flex gap-2 mt-1">
              {[1, 2, 3, 4].map((s) => (
                <Badge key={s} variant={step >= s ? "default" : "outline"} className="text-[10px]">
                  {s === 1 ? "Destinatário" : s === 2 ? "Itens" : s === 3 ? "Tributos" : "Revisão"}
                </Badge>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de NF</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as NFTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NFS-e">NFS-e</SelectItem>
                      <SelectItem value="NF-e">NF-e</SelectItem>
                      <SelectItem value="NFC-e">NFC-e</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">CPF/CNPJ *</Label>
                  <Input value={dest.cpfCnpj} onChange={(e) => setDest({ ...dest, cpfCnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Nome / Razão Social *</Label>
                <Input value={dest.nome} onChange={(e) => setDest({ ...dest, nome: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={dest.email} onChange={(e) => setDest({ ...dest, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Endereço</Label>
                <Input value={dest.endereco} onChange={(e) => setDest({ ...dest, endereco: e.target.value })} />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-3">
              {itens.map((item, idx) => (
                <div key={item.id} className="border border-border/40 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                    {itens.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <Input placeholder="Descrição do serviço/produto" value={item.descricao} onChange={(e) => updateItem(idx, { descricao: e.target.value })} />
                  <div className="grid grid-cols-4 gap-2">
                    <div><Label className="text-[10px]">Qtd</Label><Input type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) || 1 })} /></div>
                    <div><Label className="text-[10px]">Valor Unit.</Label><Input type="number" step="any" min={0} value={item.valorUnitario} onChange={(e) => updateItem(idx, { valorUnitario: Number(e.target.value) || 0 })} /></div>
                    <div><Label className="text-[10px]">Cód. Serviço</Label><Input value={item.codigoServico} onChange={(e) => updateItem(idx, { codigoServico: e.target.value })} /></div>
                    <div><Label className="text-[10px]">ISS %</Label><Input type="number" step="any" min={0} max={10} value={item.aliquotaISS} onChange={(e) => updateItem(idx, { aliquotaISS: Number(e.target.value) || 0 })} /></div>
                  </div>
                  <p className="text-xs text-right text-muted-foreground">Subtotal: R$ {(item.quantidade * item.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setItens([...itens, emptyItem()])}><Plus className="h-3 w-3" /> Adicionar Item</Button>
              <p className="text-sm font-bold text-right">Total Bruto: R$ {totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Tributos Calculados</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">ISS ({tributos.issPercent.toFixed(2)}%)</span><span className="text-right">R$ {tributos.issValor.toFixed(2)}</span>
                <span className="text-muted-foreground">PIS ({tributos.pisPercent}%)</span><span className="text-right">R$ {tributos.pisValor.toFixed(2)}</span>
                <span className="text-muted-foreground">COFINS ({tributos.cofinsPercent}%)</span><span className="text-right">R$ {tributos.cofinsValor.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Bruto</span><span>R$ {tributos.totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-destructive text-sm">
                <span>(-) Impostos Retidos</span><span>R$ {tributos.totalImpostos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-primary text-lg">
                <span>Total Líquido</span><span>R$ {tributos.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold">Resumo da Nota Fiscal</h4>
              <div className="bg-muted/30 p-3 space-y-1">
                <p><strong>Tipo:</strong> {tipo}</p>
                <p><strong>Destinatário:</strong> {dest.nome} ({dest.cpfCnpj})</p>
                <p><strong>E-mail:</strong> {dest.email || "—"}</p>
                <p><strong>Itens:</strong> {itens.length}</p>
                <p><strong>Valor Bruto:</strong> R$ {tributos.totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p><strong>Impostos:</strong> R$ {tributos.totalImpostos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-primary font-bold">Valor Líquido: R$ {tributos.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <Label className="text-xs">Observações adicionais</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações..." rows={2} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Button>
          ) : <div />}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1">Próximo <ArrowRight className="h-3.5 w-3.5" /></Button>
          ) : (
            <Button onClick={handleEmit} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Emitir Nota
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
