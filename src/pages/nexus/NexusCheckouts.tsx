import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ExternalLink, Search, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendente",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  paid:      { label: "Pago",        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  expired:   { label: "Expirado",    color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  cancelled: { label: "Cancelado",   color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  new_account: { label: "Nova Conta",  color: "bg-blue-500/10 text-blue-400" },
  upsell:      { label: "Upsell",      color: "bg-purple-500/10 text-purple-400" },
  renewal:     { label: "Renovação",   color: "bg-teal-500/10 text-teal-400" },
};

const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function NexusCheckouts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["nexus-checkouts", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("checkout_sessions")
        .select("*, accounts:account_id(name, slug), wl:whitelabel_id(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const filtered = sessions?.filter(s =>
    !search || [s.buyer_email, s.company_name, s.buyer_name].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  // KPI aggregates
  const total    = filtered.length;
  const paid     = filtered.filter(s => s.status === "paid").length;
  const pending  = filtered.filter(s => s.status === "pending").length;
  const mrr      = filtered.filter(s => s.status === "paid").reduce((acc, s) => acc + (s.monthly_value || 0), 0);
  const setupRev = filtered.filter(s => s.status === "paid").reduce((acc, s) => acc + (s.setup_fee || 0), 0);

  const copyLink = (sessionId: string) => {
    const link = `${window.location.origin}/checkout?session=${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Checkouts</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de todas as sessões de checkout e ativações.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total",      value: total,                color: "text-foreground" },
          { label: "Pagos",      value: paid,                 color: "text-emerald-400" },
          { label: "Pendentes",  value: pending,              color: "text-amber-400" },
          { label: "MRR gerado", value: formatBRL(mrr),       color: "text-emerald-400" },
          { label: "Setup*",     value: formatBRL(setupRev),  color: "text-blue-400" },
        ].map(k => (
          <Card key={k.label} className="p-4 text-center">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar email, empresa..."
            className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "paid", "expired", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "Todos" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/30 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Empresa / Email</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium text-right">MRR</th>
              <th className="px-4 py-3 font-medium text-right">1ª Cobrança</th>
              <th className="px-4 py-3 font-medium">WL / Origem</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum checkout encontrado.</td></tr>
            )}
            {filtered.map(s => {
              const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
              const tc = TYPE_CONFIG[s.checkout_type] || { label: s.checkout_type, color: "bg-secondary text-foreground" };
              return (
                <tr key={s.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}<br />
                    <span className="text-[10px]">{new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="font-medium truncate">{s.company_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.buyer_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium capitalize">{s.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400">
                    {formatBRL(s.monthly_value || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold">
                    {formatBRL(s.first_charge || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(s as any).wl?.name ? (
                      <span className="text-purple-400 font-medium">{(s as any).wl.name}</span>
                    ) : (
                      <span className="text-blue-400">Direto</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {s.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Copiar link de checkout" onClick={() => copyLink(s.id)}>
                          {copiedId === s.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {s.asaas_payment_link && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Ver no Asaas" onClick={() => window.open(s.asaas_payment_link, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">* Setup = soma das taxas de Implantação Starter dos checkouts pagos no filtro atual.</p>
    </div>
  );
}
