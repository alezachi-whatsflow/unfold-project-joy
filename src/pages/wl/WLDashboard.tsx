import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, DollarSign, Wifi, Cpu, TrendingUp } from "lucide-react";
import PoolConsumptionBar from "@/components/wl/PoolConsumptionBar";

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WLDashboard() {
  const { wlLicenseId } = useOutletContext<{ branding: any; wlLicenseId: string | null }>();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['wl-dashboard-clients', wlLicenseId],
    queryFn: async () => {
      if (!wlLicenseId) return [];
      const { data } = await supabase
        .from('licenses')
        .select(`
          id, status, monthly_value, has_ai_module,
          base_attendants, extra_attendants,
          base_devices_web, extra_devices_web,
          base_devices_meta, extra_devices_meta,
          tenants(name)
        `)
        .eq('parent_license_id', wlLicenseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!wlLicenseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const active = (clients || []).filter((c: any) => c.status === 'active');
  const mrr = (clients || []).reduce((a: number, c: any) => a + (c.monthly_value || 0), 0);
  const totalDevices = (clients || []).reduce(
    (a: number, c: any) =>
      a + (c.base_devices_web || 0) + (c.extra_devices_web || 0) +
        (c.base_devices_meta || 0) + (c.extra_devices_meta || 0),
    0
  );
  const totalAttendants = (clients || []).reduce(
    (a: number, c: any) => a + (c.base_attendants || 0) + (c.extra_attendants || 0),
    0
  );
  const withAI = (clients || []).filter((c: any) => c.has_ai_module).length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visao geral da sua operacao</p>
      </div>

      {/* Pool Consumption */}
      {wlLicenseId && <PoolConsumptionBar wlLicenseId={wlLicenseId} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="MRR Total" value={`R$ ${fmt(mrr)}`} color="#11BC76" />
        <KpiCard icon={Users} label="Clientes Ativos" value={String(active.length)} sub={`${(clients || []).length} total`} color="var(--wl-primary)" />
        <KpiCard icon={Wifi} label="Dispositivos" value={String(totalDevices)} sub="contratados" color="#6366F1" />
        <KpiCard icon={Cpu} label="Atendentes / I.A." value={String(totalAttendants)} sub={`${withAI} com I.A.`} color="#F59E0B" />
      </div>

      {/* Client table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Clientes Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(clients || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left px-6 py-3 font-medium">Cliente</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-right px-6 py-3 font-medium">Atend.</th>
                    <th className="text-right px-6 py-3 font-medium">Disp.</th>
                    <th className="text-right px-6 py-3 font-medium">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {(clients || []).map((c: any) => {
                    const t = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants;
                    const devices = (c.base_devices_web || 0) + (c.extra_devices_web || 0) +
                      (c.base_devices_meta || 0) + (c.extra_devices_meta || 0);
                    const attendants = (c.base_attendants || 0) + (c.extra_attendants || 0);
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="px-6 py-3 font-medium text-foreground">{t?.name || '—'}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {c.status === 'active' ? 'Ativo' : c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{attendants}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{devices}</td>
                        <td className="px-6 py-3 text-right font-semibold" style={{ color: 'var(--wl-primary)' }}>
                          R$ {fmt(c.monthly_value || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 mt-0.5" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}
