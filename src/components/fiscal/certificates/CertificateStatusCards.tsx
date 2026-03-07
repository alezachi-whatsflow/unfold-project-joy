import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CalendarClock, KeyRound } from "lucide-react";
import { Certificate } from "@/types/certificates";
import { differenceInDays, parseISO, format } from "date-fns";

interface Props {
  activeCert: Certificate | null;
}

function getDaysRemaining(dateStr: string) {
  return differenceInDays(parseISO(dateStr), new Date());
}

function getExpiryColor(days: number) {
  if (days <= 10) return "bg-destructive text-destructive-foreground";
  if (days <= 30) return "bg-[hsl(38,92%,50%)] text-background";
  return "bg-primary text-primary-foreground";
}

export default function CertificateStatusCards({ activeCert }: Props) {
  const days = activeCert ? getDaysRemaining(activeCert.validoAte) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Certificado Ativo */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-full p-2.5 bg-primary/10 shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Certificado Ativo</p>
            {activeCert ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate">{activeCert.razaoSocial}</p>
                <p className="text-xs text-muted-foreground">{activeCert.cnpj}</p>
                <p className="text-xs text-muted-foreground">Válido até {format(parseISO(activeCert.validoAte), "dd/MM/yyyy")}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum certificado cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vencimento */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-full p-2.5 bg-primary/10 shrink-0">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
            {activeCert && days !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{days > 0 ? days : 0}</span>
                <span className="text-sm text-muted-foreground">dias restantes</span>
                <Badge className={getExpiryColor(days)}>
                  {days <= 0 ? "Vencido" : days <= 10 ? "Crítico" : days <= 30 ? "Atenção" : "OK"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tipo */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-full p-2.5 bg-primary/10 shrink-0">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipo</p>
            {activeCert ? (
              <>
                <p className="text-lg font-bold text-foreground">{activeCert.tipo}</p>
                <p className="text-xs text-muted-foreground">
                  {activeCert.tipo === "A1" ? "Arquivo .pfx" : "Token / Smartcard"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
