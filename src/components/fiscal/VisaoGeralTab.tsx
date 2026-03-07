import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, ShieldCheck, Settings, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart } from "recharts";
import { loadNotas } from "@/lib/notasFiscaisData";
import { NotaFiscal } from "@/types/notasFiscais";
import { Certificate } from "@/types/certificates";
import { FiscalConfig } from "@/types/fiscalConfig";
import { differenceInDays, subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const REGIME_LABELS: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
};

const PIE_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

function loadCertificates(): Certificate[] {
  try { const r = localStorage.getItem("fiscal_certificados"); return r ? JSON.parse(r) : []; } catch { return []; }
}

function loadConfig(): FiscalConfig | null {
  try { const r = localStorage.getItem("fiscal_configuracoes"); return r ? JSON.parse(r) : null; } catch { return null; }
}

export default function VisaoGeralTab() {
  const notas = useMemo(() => loadNotas(), []);
  const certs = useMemo(() => loadCertificates(), []);
  const config = useMemo(() => loadConfig(), []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Current month NFs
  const thisMonthNFs = notas.filter((n) => {
    const d = new Date(n.dataEmissao);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const emitidas = thisMonthNFs.filter((n) => n.status === "emitida");
  const totalEmitido = emitidas.reduce((s, n) => s + n.valor, 0);
  const totalImpostos = emitidas.reduce((s, n) => s + n.impostos, 0);

  // Certificate status
  const activeCert = certs.find((c) => c.status === "active");
  const certDaysLeft = activeCert ? differenceInDays(new Date(activeCert.validoAte), now) : null;

  // Regime
  const regime = config?.regimeTributario ? REGIME_LABELS[config.regimeTributario] || config.regimeTributario : "Não configurado";

  // --- Bar chart: last 6 months ---
  const barData = useMemo(() => {
    const months: { name: string; bruto: number; liquido: number; impostos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = subMonths(now, i);
      const start = startOfMonth(ref);
      const end = endOfMonth(ref);
      const monthNFs = notas.filter((n) => n.status === "emitida" && isWithinInterval(new Date(n.dataEmissao), { start, end }));
      const bruto = monthNFs.reduce((s, n) => s + n.valor, 0);
      const imp = monthNFs.reduce((s, n) => s + n.impostos, 0);
      months.push({ name: format(ref, "MMM/yy", { locale: ptBR }), bruto, liquido: bruto - imp, impostos: imp });
    }
    return months;
  }, [notas]);

  // --- Pie chart: tax composition current month ---
  const pieData = useMemo(() => {
    const totals = { ISS: 0, PIS: 0, COFINS: 0, IRPJ: 0, CSLL: 0 };
    emitidas.forEach((n) => {
      totals.ISS += n.tributos.issValor;
      totals.PIS += n.tributos.pisValor;
      totals.COFINS += n.tributos.cofinsValor;
      totals.IRPJ += n.tributos.irpjValor;
      totals.CSLL += n.tributos.csllValor;
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [emitidas]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // --- Alerts ---
  const alerts: { type: "warning" | "error" | "info"; text: string }[] = [];
  if (certDaysLeft !== null && certDaysLeft <= 30) {
    alerts.push({ type: certDaysLeft <= 10 ? "error" : "warning", text: `Certificado digital vence em ${certDaysLeft} dia(s). Providencie a renovação.` });
  }
  const rejeitadas = notas.filter((n) => n.status === "rejeitada").length;
  if (rejeitadas > 0) alerts.push({ type: "error", text: `${rejeitadas} nota(s) fiscal(is) rejeitada(s) pendente(s) de ação.` });
  const pendentes = notas.filter((n) => n.status === "pendente").length;
  if (pendentes > 0) alerts.push({ type: "warning", text: `${pendentes} nota(s) fiscal(is) pendente(s) de processamento.` });
  if (!config || !config.cnpj) alerts.push({ type: "info", text: "Configurações fiscais incompletas. Acesse a aba 'Configurações Fiscais'." });

  const cards = [
    { label: "Total NFs (mês)", value: `${emitidas.length}`, sub: `R$ ${totalEmitido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Impostos Pagos", value: `R$ ${totalImpostos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: "ISS + PIS + COFINS + outros", icon: Receipt, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Certificado", value: activeCert ? `${certDaysLeft}d restantes` : "Nenhum", sub: activeCert ? activeCert.razaoSocial : "Faça upload na aba Certificados", icon: ShieldCheck, color: certDaysLeft !== null && certDaysLeft <= 10 ? "text-red-400" : certDaysLeft !== null && certDaysLeft <= 30 ? "text-amber-400" : "text-emerald-400", bg: certDaysLeft !== null && certDaysLeft <= 10 ? "bg-red-500/10" : certDaysLeft !== null && certDaysLeft <= 30 ? "bg-amber-500/10" : "bg-emerald-500/10" },
    { label: "Regime Tributário", value: regime, sub: config?.cnpj || "CNPJ não configurado", icon: Settings, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/40" style={{ borderRadius: 12 }}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`rounded-lg p-2.5 ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold text-foreground">{c.value}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 border-border/40" style={{ borderRadius: 12 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">NFs Emitidas vs Impostos — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="bruto" name="Valor Bruto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="liquido" name="Valor Líquido" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="impostos" name="Impostos" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border/40" style={{ borderRadius: 12 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Composição Tributária (mês)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] flex flex-col items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de impostos neste mês</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                      {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {pieData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}: R$ {d.value.toFixed(2)} ({pieTotal > 0 ? ((d.value / pieTotal) * 100).toFixed(0) : 0}%)
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-border/40" style={{ borderRadius: 12 }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Tudo em ordem — nenhuma pendência fiscal encontrada.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 text-sm rounded-lg p-2.5 ${a.type === "error" ? "bg-red-500/10 text-red-400" : a.type === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"}`}>
                  {a.type === "error" ? <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
