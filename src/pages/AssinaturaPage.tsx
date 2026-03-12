import { useUserTenants } from "@/hooks/useUserTenants";
import { useLicenseLimits } from "@/hooks/useLicenseLimits";
import { LicenseAlertBanner } from "@/components/license/LicenseAlertBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Shield, Smartphone, Monitor, Users, Bot, Headphones, CheckCircle2, XCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AssinaturaPage() {
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const { data: limits, isLoading } = useLicenseLimits(tenantId);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!limits) {
    return <div className="text-center py-20 text-muted-foreground">Nenhuma licença encontrada.</div>;
  }

  const planLabel = limits.plan === 'profissional' ? 'Profissional' : 'Solo Pro';
  const daysLeft = limits.validUntil ? differenceInDays(new Date(limits.validUntil), new Date()) : null;

  const usageItems = [
    { label: 'Dispositivos Web', current: limits.currentDevicesWeb, max: limits.maxDevicesWeb, icon: Monitor },
    { label: 'Dispositivos Meta', current: limits.currentDevicesMeta, max: limits.maxDevicesMeta, icon: Smartphone },
    { label: 'Atendentes', current: limits.currentAttendants, max: limits.maxAttendants, icon: Users },
  ];

  const facilitePlanLabel: Record<string, string> = {
    none: 'Nenhum', basico: 'Básico (8h/mês)', intermediario: 'Intermediário (20h/mês)', avancado: 'Avançado (40h/mês)'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura & Licença</h1>
        <p className="text-muted-foreground text-sm">Visualize seu plano atual e limites.</p>
      </div>

      <LicenseAlertBanner status={limits.status} validUntil={limits.validUntil} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Plan Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Plano Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{planLabel}</span>
              <Badge variant={limits.status === 'active' ? 'default' : 'destructive'}>
                {limits.status === 'active' ? 'Ativo' : limits.status === 'suspended' ? 'Suspenso' : 'Cancelado'}
              </Badge>
            </div>
            {limits.validUntil && (
              <div className="text-sm text-muted-foreground">
                Validade: {format(new Date(limits.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {daysLeft !== null && daysLeft > 0 && <span className="ml-2">({daysLeft} dias restantes)</span>}
              </div>
            )}
            <div className="text-2xl font-bold text-primary">
              R$ {limits.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Recursos Incluídos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {limits.hasAiModule ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <Bot className="h-4 w-4" />
              <span className="text-sm">Módulo I.A. {limits.hasAiModule ? '(Ativo)' : '(Inativo)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" />
              <span className="text-sm">Facilite: {facilitePlanLabel[limits.facilitePlan] || 'Nenhum'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Uso Atual vs Limites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {usageItems.map(item => {
              const pct = item.max > 0 ? (item.current / item.max) * 100 : 0;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{item.current} de {item.max} utilizados</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Gostaria de expandir meu plano Whatsflow.', '_blank')}
        >
          Falar com Whatsflow para Expandir
        </Button>
      </div>
    </div>
  );
}
