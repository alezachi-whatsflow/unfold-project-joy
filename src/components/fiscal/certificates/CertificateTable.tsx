import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Certificate } from "@/types/certificates";
import { differenceInDays, parseISO, format } from "date-fns";
import { RefreshCw, Ban, Download } from "lucide-react";

interface Props {
  certificates: Certificate[];
  onRevoke: (id: string) => void;
  onRenew: (id: string) => void;
}

function statusBadge(cert: Certificate) {
  const days = differenceInDays(parseISO(cert.validoAte), new Date());
  if (cert.status === "revogado") return <Badge variant="destructive">Revogado</Badge>;
  if (days <= 0) return <Badge variant="destructive">Vencido</Badge>;
  if (days <= 10) return <Badge className="bg-destructive text-destructive-foreground">Crítico ({days}d)</Badge>;
  if (days <= 30) return <Badge className="bg-[hsl(38,92%,50%)] text-background">Atenção ({days}d)</Badge>;
  return <Badge className="bg-primary text-primary-foreground">Ativo ({days}d)</Badge>;
}

export default function CertificateTable({ certificates, onRevoke, onRenew }: Props) {
  if (certificates.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Nenhum certificado cadastrado.
      </div>
    );
  }

  return (
    <div className="border border-border/40 overflow-hidden" style={{ borderRadius: 12 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Razão Social</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Emissora</TableHead>
            <TableHead>Válido até</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((cert, i) => (
            <TableRow key={cert.id}>
              <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-mono text-xs">{cert.cnpj}</TableCell>
              <TableCell>{cert.razaoSocial}</TableCell>
              <TableCell><Badge variant="outline">{cert.tipo}</Badge></TableCell>
              <TableCell>{cert.emissora}</TableCell>
              <TableCell>{format(parseISO(cert.validoAte), "dd/MM/yyyy")}</TableCell>
              <TableCell>{statusBadge(cert)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Renovar" onClick={() => onRenew(cert.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Revogar" onClick={() => onRevoke(cert.id)} disabled={cert.status === "revogado"}>
                    <Ban className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Baixar Metadados" onClick={() => {
                    const blob = new Blob([JSON.stringify({ cnpj: cert.cnpj, razaoSocial: cert.razaoSocial, tipo: cert.tipo, emissora: cert.emissora, validoAte: cert.validoAte, status: cert.status }, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `certificado_${cert.cnpj.replace(/\D/g, "")}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
