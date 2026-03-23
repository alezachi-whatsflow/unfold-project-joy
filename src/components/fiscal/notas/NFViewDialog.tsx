import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotaFiscal, statusColors, statusLabels } from "@/types/notasFiscais";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  nf: NotaFiscal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NFViewDialog({ nf, open, onOpenChange }: Props) {
  if (!nf) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            NF {nf.numero}
            <Badge variant="outline" className={`text-[10px] ${statusColors[nf.status]}`}>{statusLabels[nf.status]}</Badge>
          </DialogTitle>
          <DialogDescription>{nf.tipo} — {format(new Date(nf.dataEmissao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Destinatário</h4>
            <p>{nf.clienteNome}</p>
            <p className="text-muted-foreground">{nf.clienteCpfCnpj} • {nf.clienteEmail}</p>
            <p className="text-muted-foreground">{nf.clienteEndereco}</p>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-2">Itens</h4>
            <div className="space-y-1">
              {nf.itens.map((item) => (
                <div key={item.id} className="flex justify-between text-xs bg-muted/30 rounded p-2">
                  <span>{item.descricao} ({item.quantidade}x)</span>
                  <span>R$ {(item.quantidade * item.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-2">Tributos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              {nf.tributos.issValor > 0 && <><span className="text-muted-foreground">ISS ({nf.tributos.issPercent}%)</span><span className="text-right">R$ {nf.tributos.issValor.toFixed(2)}</span></>}
              {nf.tributos.pisValor > 0 && <><span className="text-muted-foreground">PIS ({nf.tributos.pisPercent}%)</span><span className="text-right">R$ {nf.tributos.pisValor.toFixed(2)}</span></>}
              {nf.tributos.cofinsValor > 0 && <><span className="text-muted-foreground">COFINS ({nf.tributos.cofinsPercent}%)</span><span className="text-right">R$ {nf.tributos.cofinsValor.toFixed(2)}</span></>}
              {nf.tributos.irpjValor > 0 && <><span className="text-muted-foreground">IRPJ ({nf.tributos.irpjPercent}%)</span><span className="text-right">R$ {nf.tributos.irpjValor.toFixed(2)}</span></>}
              {nf.tributos.csllValor > 0 && <><span className="text-muted-foreground">CSLL ({nf.tributos.csllPercent}%)</span><span className="text-right">R$ {nf.tributos.csllValor.toFixed(2)}</span></>}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total Bruto</span>
              <span>R$ {nf.tributos.totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-destructive text-xs">
              <span>(-) Impostos</span>
              <span>R$ {nf.tributos.totalImpostos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-primary">
              <span>Total Líquido</span>
              <span>R$ {nf.tributos.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {nf.motivoCancelamento && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-destructive mb-1">Motivo do Cancelamento</h4>
                <p className="text-xs text-muted-foreground">{nf.motivoCancelamento}</p>
              </div>
            </>
          )}

          {nf.observacoes && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Observações</h4>
                <p className="text-xs text-muted-foreground">{nf.observacoes}</p>
              </div>
            </>
          )}

          <Separator />
          <div>
            <h4 className="font-semibold text-foreground mb-1">XML (simulado)</h4>
            <pre className="text-[10px] bg-muted/40 rounded p-3 overflow-x-auto max-h-[120px] text-muted-foreground">
{`<?xml version="1.0" encoding="UTF-8"?>
<NFSe>
  <Numero>${nf.numero}</Numero>
  <Tipo>${nf.tipo}</Tipo>
  <Emissao>${format(new Date(nf.dataEmissao), "yyyy-MM-dd")}</Emissao>
  <Destinatario>
    <Nome>${nf.clienteNome}</Nome>
    <CPFCNPJ>${nf.clienteCpfCnpj}</CPFCNPJ>
  </Destinatario>
  <ValorBruto>${nf.tributos.totalBruto.toFixed(2)}</ValorBruto>
  <ValorLiquido>${nf.tributos.totalLiquido.toFixed(2)}</ValorLiquido>
</NFSe>`}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
