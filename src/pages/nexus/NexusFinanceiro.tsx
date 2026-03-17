import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Target, Loader2 } from 'lucide-react';

export default function NexusFinanceiro() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceiro();
  }, []);

  async function loadFinanceiro() {
    setLoading(true);
    const { data: licenses } = await supabase
      .from('licenses')
      .select('monthly_value, status, has_ai_module, created_at');

    const active = (licenses || []).filter((l: any) => l.status === 'active');
    const mrr = active.reduce((s: number, l: any) => s + (Number(l.monthly_value) || 0), 0);
    const arr = mrr * 12;
    const pagantes = active.filter((l: any) => Number(l.monthly_value) > 0);
    const ticketMedio = pagantes.length > 0 ? mrr / pagantes.length : 0;

    // New licenses this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = (licenses || []).filter(
      (l: any) => new Date(l.created_at) >= startOfMonth
    ).length;

    setStats({ mrr, arr, ticketMedio, newThisMonth, totalActive: active.length, totalPagantes: pagantes.length });
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
    { title: 'MRR Total', value: `R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500' },
    { title: 'ARR Estimado', value: `R$ ${stats.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-blue-500' },
    { title: 'Ticket Médio', value: `R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Target, color: 'text-amber-500' },
    { title: 'Novas (mês)', value: stats.newThisMonth, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          {stats.totalActive} licenças ativas — {stats.totalPagantes} pagantes
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="bg-card/50 border-border/50">
            <CardContent className="pt-5 pb-4">
              <c.icon className={`h-5 w-5 mb-2 ${c.color}`} />
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
