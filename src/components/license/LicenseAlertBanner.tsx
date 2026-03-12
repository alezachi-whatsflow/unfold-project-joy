import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { differenceInDays } from "date-fns";

interface LicenseAlertBannerProps {
  status: string;
  validUntil: string | null;
}

export function LicenseAlertBanner({ status, validUntil }: LicenseAlertBannerProps) {
  const alert = useMemo(() => {
    if (status === 'suspended') {
      return { type: 'critical' as const, icon: XCircle, message: 'Sua conta está suspensa. Entre em contato com a Whatsflow para reativação.' };
    }
    if (status === 'cancelled') {
      return { type: 'critical' as const, icon: ShieldAlert, message: 'Sua conta foi cancelada. Dados serão removidos após o período de graça.' };
    }
    if (validUntil) {
      const days = differenceInDays(new Date(validUntil), new Date());
      if (days <= 0) return { type: 'critical' as const, icon: XCircle, message: 'Sua licença expirou! Renove para manter o acesso.' };
      if (days <= 7) return { type: 'critical' as const, icon: AlertTriangle, message: `Sua licença vence em ${days} dia(s). Renove agora.` };
      if (days <= 30) return { type: 'warning' as const, icon: AlertTriangle, message: `Sua licença vence em ${days} dias.` };
    }
    return null;
  }, [status, validUntil]);

  if (!alert) return null;

  return (
    <Alert variant={alert.type === 'critical' ? 'destructive' : 'default'} className="mb-4">
      <alert.icon className="h-4 w-4" />
      <AlertDescription className="font-medium">{alert.message}</AlertDescription>
    </Alert>
  );
}
