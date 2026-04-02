import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, DollarSign, AlertTriangle, Brain, TrendingUp, Loader2,
} from "lucide-react";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalMRR: number;
  expiringIn30: number;
  tenantsWithAI: number;
  newLast30: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [tenantsRes, licensesRes, recentRes] = await Promise.all([
      supabase.from("tenants").select("id, name, status, created_at, valid_until, plan"),
      supabase.from("licenses").select("monthly_value, has_ai_module, expires_at, tenant_id"),
      supabase.from("tenants").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    const tenants = tenantsRes.data || [];
    const licenses = licensesRes.data || [];

    const activeTenants = tenants.filter((t: any) => t.status === "active").length;
    const totalMRR = licenses.reduce((sum: number, l: any) => sum + (Number(l.monthly_value) || 0), 0);
    const expiringIn30 = tenants.filter((t: any) => {
      if (!t.valid_until) return false;
      const exp = new Date(t.valid_until);
      return exp > now && exp <= thirtyDaysFromNow;
    }).length;
    const tenantsWithAI = licenses.filter((l: any) => l.has_ai_module).length;
    const newLast30 = tenants.filter((t: any) => new Date(t.created_at) >= thirtyDaysAgo).length;

    setStats({
      totalTenants: tenants.length,
      activeTenants,
      totalMRR,
      expiringIn30,
      tenantsWithAI,
      newLast30,
    });
    setRecentTenants(recentRes.data || []);
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
      title: "Tenants Ativos",
      value: stats!.activeTenants,
      subtitle: `${stats!.totalTenants} total`,
      icon: Building2,
      color: "text-emerald-500",
    },
    {
      title: "MRR Total",
      value: `R$ ${stats!.totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      subtitle: "Receita recorrente",
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      title: "Vencendo em 30d",
      value: stats!.expiringIn30,
      subtitle: "Licenças próximas",
      icon: AlertTriangle,
      color: stats!.expiringIn30 > 0 ? "text-amber-500" : "text-muted-foreground",
    },
    {
      title: "Módulo I.A.",
      value: stats!.tenantsWithAI,
      subtitle: "Tenants com I.A.",
      icon: Brain,
      color: "text-purple-500",
    },
    {
      title: "Novos (30d)",
      value: stats!.newLast30,
      subtitle: "Último mês",
      icon: TrendingUp,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Global</h1>
        <p className="text-sm text-muted-foreground">Visão geral de todos os tenants Whatsflow</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
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

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tenants Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTenants.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t.plan === "profissional" ? "Profissional" : "Solo Pro"}
                  </Badge>
                  <Badge
                    variant={t.status === "active" ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {t.status === "active" ? "Ativo" : t.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {fmtDate(t.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
