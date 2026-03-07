import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileDown, Mail, XCircle } from "lucide-react";
import { NotaFiscal, statusColors, statusLabels } from "@/types/notasFiscais";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  notas: NotaFiscal[];
  onView: (nf: NotaFiscal) => void;
  onDownloadPDF: (nf: NotaFiscal) => void;
  onResend: (nf: NotaFiscal) => void;
  onCancel: (nf: NotaFiscal) => void;
}

export default function NFTable({ notas, onView, onDownloadPDF, onResend, onCancel }: Props) {
  if (notas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma nota fiscal encontrada com os filtros aplicados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[90px]"># NF</TableHead>
            <TableHead className="w-[70px]">Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">CNPJ/CPF</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Impostos</TableHead>
            <TableHead className="hidden sm:table-cell">Emissão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notas.map((nf) => (
            <TableRow key={nf.id}>
              <TableCell className="font-mono text-xs">{nf.numero}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{nf.tipo}</Badge></TableCell>
              <TableCell className="font-medium truncate max-w-[180px]">{nf.clienteNome}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{nf.clienteCpfCnpj}</TableCell>
              <TableCell className="text-right font-medium">R$ {nf.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right hidden lg:table-cell text-xs text-muted-foreground">R$ {nf.impostos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{format(new Date(nf.dataEmissao), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] ${statusColors[nf.status]}`}>
                  {statusLabels[nf.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar" onClick={() => onView(nf)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Download PDF" onClick={() => onDownloadPDF(nf)}><FileDown className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Reenviar e-mail" onClick={() => onResend(nf)}><Mail className="h-3.5 w-3.5" /></Button>
                  {nf.status !== "cancelada" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Cancelar" onClick={() => onCancel(nf)}><XCircle className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
