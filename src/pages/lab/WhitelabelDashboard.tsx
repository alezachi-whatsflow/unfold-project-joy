import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, DollarSign } from 'lucide-react';

export default function WhitelabelDashboard() {
  const { config } = useOutletContext<{ config: any }>();
  const licenseId = config?.licenses?.id;

  const { data: subLicenses } = useQuery({
    queryKey: ['wl-sub-licenses', licenseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('licenses')
        .select('id, status, monthly_value, plan, tenants(name)')
        .eq('parent_license_id', licenseId);
      return data || [];
    },
    enabled: !!licenseId,
  });

  const active = subLicenses?.filter((l: any) => l.status === 'active').length || 0;
  const totalMRR = subLicenses?.reduce((sum: number, l: any) => sum + Number(l.monthly_value || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard — {config?.display_name}</h1>
        <p className="text-sm text-muted-foreground">Visão geral do parceiro WhiteLabel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Sub-licenças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{subLicenses?.length || 0}</p>
            <p className="text-xs text-muted-foreground">{active} ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> MRR Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{config?.max_sub_licenses || 50}</p>
            <p className="text-xs text-muted-foreground">sub-licenças permitidas</p>
          </CardContent>
        </Card>
      </div>

      {subLicenses && subLicenses.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Licenças Gerenciadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subLicenses.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(l.tenants as any)?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{l.plan}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">R$ {Number(l.monthly_value || 0).toFixed(2)}</span>
                    <Badge className={l.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}>
                      {l.status === 'active' ? 'Ativo' : l.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
