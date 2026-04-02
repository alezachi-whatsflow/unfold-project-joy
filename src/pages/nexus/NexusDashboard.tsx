import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound, DollarSign, AlertTriangle, Brain, TrendingUp, Loader2,
  Users, Ticket, Building2,
} from 'lucide-react';

interface DashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  totalMRR: number;
  inadimplentes: number;
  expiringIn30: number;
  inactiveLicenses: number;
  withAI: number;
  openTickets: number;
}

export default function NexusDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [criticalLicenses, setCriticalLicenses] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [licensesRes, ticketsRes] = await Promise.all([
      supabase.from('licenses').select('id, status, monthly_value, has_ai_module, expires_at, tenant_id'),
      supabase.from('nexus_tickets').select('id, status').eq('status', 'aberto'),
    ]);

    const licenses = licensesRes.data || [];
    const activeLicenses = licenses.filter((l: any) => l.status === 'active');
    const totalMRR = activeLicenses.reduce((sum: number, l: any) => sum + (Number(l.monthly_value) || 0), 0);
    const expiringIn30 = licenses.filter((l: any) => {
      if (!l.expires_at) return false;
      const exp = new Date(l.expires_at);
      return exp > now && exp <= thirtyDaysFromNow;
    }).length;
    const withAI = licenses.filter((l: any) => l.has_ai_module).length;

    setStats({
      totalLicenses: licenses.length,
      activeLicenses: activeLicenses.length,
      totalMRR,
      inadimplentes: 0, // Will be populated from nexus-specific data
      expiringIn30,
      inactiveLicenses: licenses.filter((l: any) => l.status !== 'active').length,
      withAI,
      openTickets: ticketsRes.data?.length || 0,
    });

    // Critical licenses
    const critical = licenses
      .filter((l: any) => {
        if (!l.expires_at) return false;
        const exp = new Date(l.expires_at);
        return exp <= new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      })
      .slice(0, 10);
    setCriticalLicenses(critical);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Licenças Ativas',
      value: stats!.activeLicenses,
      subtitle: `${stats!.totalLicenses} total`,
      icon: KeyRound,
      color: 'text-emerald-500',
    },
    {
      title: 'MRR Total',
      value: `R$ ${stats!.totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: 'Receita recorrente',
      icon: DollarSign,
      color: 'text-blue-500',
    },
    {
      title: 'Inadimplentes',
      value: stats!.inadimplentes,
      subtitle: 'Ação necessária',
      icon: AlertTriangle,
      color: stats!.inadimplentes > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
    {
      title: 'Vencendo 30 dias',
      value: stats!.expiringIn30,
      subtitle: 'Próximas renovações',
      icon: AlertTriangle,
      color: stats!.expiringIn30 > 0 ? 'text-amber-500' : 'text-muted-foreground',
    },
    {
      title: 'Licenças Inativas',
      value: stats!.inactiveLicenses,
      subtitle: 'Canceladas/Bloqueadas',
      icon: Building2,
      color: 'text-muted-foreground',
    },
    {
      title: 'Módulo I.A.',
      value: stats!.withAI,
      subtitle: 'Licenças com I.A.',
      icon: Brain,
      color: 'text-purple-500',
    },
    {
      title: 'Tickets Abertos',
      value: stats!.openTickets,
      subtitle: 'Suporte interno',
      icon: Ticket,
      color: stats!.openTickets > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Global</h1>
        <p className="text-sm text-muted-foreground">Visão geral do SaaS Whatsflow</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-card/50 border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
              <p className="text-[10px] text-muted-foreground/60">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Licenses */}
      {criticalLicenses.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Licenças Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalLicenses.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{l.tenant_id}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                      {l.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {l.expires_at ? fmtDate(l.expires_at) : '—'}
                    </span>
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
