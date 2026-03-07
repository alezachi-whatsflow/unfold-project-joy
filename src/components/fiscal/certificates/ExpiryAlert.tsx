import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Certificate } from "@/types/certificates";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  activeCert: Certificate | null;
}

export default function ExpiryAlert({ activeCert }: Props) {
  if (!activeCert) return null;
  const days = differenceInDays(parseISO(activeCert.validoAte), new Date());
  if (days > 30) return null;

  const isCritical = days <= 10;

  return (
    <Alert
      className="border"
      style={{
        backgroundColor: isCritical ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.12)",
        borderColor: isCritical ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)",
        borderRadius: 12,
      }}
    >
      <AlertTriangle className="h-4 w-4" style={{ color: isCritical ? "hsl(0,84%,60%)" : "hsl(38,92%,50%)" }} />
      <AlertTitle className="text-foreground">
        {days <= 0 ? "Certificado vencido!" : `Certificado vence em ${days} dias`}
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {days <= 0
          ? "Seu certificado digital está vencido. A emissão de notas fiscais está bloqueada até a renovação."
          : "⚠️ Seu certificado digital vence em " + days + " dias. Providencie a renovação para não interromper a emissão de notas."}
      </AlertDescription>
    </Alert>
  );
}
