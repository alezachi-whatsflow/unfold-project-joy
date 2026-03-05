import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Receipt, Check, AlertCircle, Eye } from "lucide-react";
import type { CreationResult } from "../AsaasBillingManagerPanel";

interface Props {
  results: CreationResult[];
  onViewArtifacts?: (result: CreationResult) => void;
}

export function BillingResultsCard({ results, onViewArtifacts }: Props) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Resultado da Criação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-xs text-muted-foreground">ID Asaas</TableHead>
              <TableHead className="text-xs text-muted-foreground">Mensagem</TableHead>
              <TableHead className="text-xs text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r, i) => (
              <TableRow key={i} className="border-border">
                <TableCell>
                  {r.status === "success" ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell className="text-xs font-medium">{r.customer}</TableCell>
                <TableCell className="text-xs font-mono">{r.asaasId || "-"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.message}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1">
                    {r.status === "success" && (r.invoiceUrl || r.bankSlipUrl || r.pixCopyPaste || r.pixQrCodeImage) && onViewArtifacts && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => onViewArtifacts(r)}
                      >
                        <Eye className="h-3 w-3" />
                        Ver Detalhes
                      </Button>
                    )}
                    {r.invoiceUrl && (
                      <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10">
                          Fatura
                        </Badge>
                      </a>
                    )}
                    {r.bankSlipUrl && (
                      <a href={r.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10">
                          Boleto
                        </Badge>
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
