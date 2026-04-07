import { fmtTime } from "@/lib/dateUtils";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PenLine, TrendingUp, DollarSign, Receipt, FileText, UserCheck,
  Users, Package, ShoppingCart, MessageSquare, LayoutDashboard, Radar,
  FileBarChart, Settings, Rocket, Bell, Menu, X, Plug,
  BarChart3, Puzzle, CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import { NotificationBell } from "@/components/layout/NotificationBell";

/* ── helpers ─────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

/* ── types ───────────────────────────────────── */
interface DockItem {
  icon: LucideIcon; label: string; route: string; badge?: number; group: number;
}

/* ── component ───────────────────────────────── */
export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenu, setMobileMenu] = useState(false);

  /* First access detection — redirect to Wizard */
  useEffect(() => {
    if (!user?.id) return;
    const key = `pzaafi_wizard_done_${user.id}`;
    if (localStorage.getItem(key)) return;

    (async () => {
      const { data: profile } = await supabase
        .from("company_profile")
        .select("wizard_completed")
        .maybeSingle();

      if (!profile || !profile.wizard_completed) {
        const s = window.location.pathname.match(/\/app\/([^/]+)/)?.[1] || "whatsflow";
        navigate(`/app/${s}/vendas`, { replace: true });
      } else {
        localStorage.setItem(key, "true");
      }
    })();
  }, [user?.id, navigate]);

  /* KPI state */
  const [pendingCount, setPendingCount] = useState(0);
  const [pipelineCount, setPipelineCount] = useState(0);
  const [msgsToday, setMsgsToday] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [activity, setActivity] = useState<{ text: string; time: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: pc }, { count: pipe }, { count: msgs }, { data: fin }, { data: logs }] = await Promise.all([
        supabase.from("asaas_payments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("negocios").select("*", { count: "exact", head: true }).not("status", "in", '("ganho","perdido")'),
        supabase.from("message_logs").select("*", { count: "exact", head: true }).gte("timestamp", new Date().toISOString().slice(0, 10)),
        supabase.from("financial_entries").select("mrr").order("month", { ascending: false }).limit(1),
        supabase.from("message_logs").select("conteudo,timestamp,conversa_id").order("timestamp", { ascending: false }).limit(3),
      ]);
      setPendingCount(pc ?? 0);
      setPipelineCount(pipe ?? 0);
      setMsgsToday(msgs ?? 0);
      setMrr(fin?.[0]?.mrr ?? 0);
      setActivity(
        (logs ?? []).map((l: any) => ({
          text: `Msg de ${l.conversa_id?.slice(-4) ?? "?"}`,
          time: fmtTime(l.timestamp),
        }))
      );
    })();
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Usuário";

  /* dock items — menu completo */
  const dock: DockItem[] = useMemo(() => [
    // Financeiro
    { icon: PenLine, label: "Inserir Dados", route: "/input", group: 1 },
    { icon: TrendingUp, label: "Receitas", route: "/revenue", group: 1 },
    { icon: DollarSign, label: "Despesas", route: "/expenses", group: 1 },
    { icon: Receipt, label: "Cobranças", route: "/cobrancas", badge: pendingCount, group: 1 },
    { icon: FileText, label: "Fiscal", route: "/fiscal", group: 1 },
    { icon: UserCheck, label: "Comissões", route: "/comissoes", group: 1 },
    // Clientes & Produtos
    { icon: Users, label: "Clientes", route: "/customers", group: 2 },
    { icon: Package, label: "Produtos", route: "/products", group: 2 },
    { icon: ShoppingCart, label: "Vendas", route: "/vendas", group: 2 },
    { icon: MessageSquare, label: "Caixa de Entrada", route: "/mensageria", group: 2 },
    // Analytics
    { icon: LayoutDashboard, label: "Dashboard", route: "/dashboard", group: 3 },
    { icon: BarChart3, label: "Analytics", route: "/analytics", group: 3 },
    { icon: Radar, label: "Int. Digital", route: "/intelligence", group: 3 },
    { icon: FileBarChart, label: "Relatórios", route: "/reports", group: 3 },
    // Sistema
    { icon: Users, label: "Usuários", route: "/usuarios", group: 4 },
    { icon: Settings, label: "Configurações", route: "/settings", group: 4 },
    { icon: Puzzle, label: "Integrações", route: "/integracoes", group: 4 },
    { icon: CreditCard, label: "Assinatura", route: "/assinatura", group: 4 },
  ], [pendingCount]);

  const finLinks = [
    { icon: PenLine, label: "Inserir Dados", route: "/input" },
    { icon: TrendingUp, label: "Receitas", route: "/revenue" },
    { icon: DollarSign, label: "Despesas", route: "/expenses" },
    { icon: Receipt, label: "Cobranças", route: "/cobrancas", badge: pendingCount },
    { icon: FileText, label: "Fiscal", route: "/fiscal" },
    { icon: UserCheck, label: "Comissões", route: "/comissoes" },
  ];

  const cpLinks = [
    { icon: Users, label: "Clientes", route: "/customers" },
    { icon: Package, label: "Produtos", route: "/products" },
    { icon: ShoppingCart, label: "Vendas", route: "/vendas" },
    { icon: MessageSquare, label: "Caixa de Entrada", route: "/mensageria" },
  ];

  const analyticsLinks = [
    { icon: LayoutDashboard, label: "Dashboard", route: "/dashboard" },
    { icon: Radar, label: "Int. Digital", route: "/intelligence" },
    { icon: FileBarChart, label: "Relatórios", route: "/reports" },
  ];

  // Força o prefixo do workspace para evitar 404 na nova estrutura multitenant (Fase 4)
  const go = (r: string) => navigate(`/app/whatsflow${r}`);

  /* ── glass card wrapper ────────────────────── */
  const Glass = ({ children, className = "", delay = 0, onClick }: {
    children: React.ReactNode; className?: string; delay?: number; onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`glass-card ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );

  return (
    <div className="home-page-root">
      {/* ambient spheres */}
      <div className="home-sphere home-sphere-1" />
      <div className="home-sphere home-sphere-2" />
      <div className="home-sphere home-sphere-3" />

      {/* ── HEADER ───────────────────────────── */}
      <header className="home-header glass-header">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold font-mono text-[#E5E8ED] tracking-wider hidden sm:inline">PZAAFI</span>
          <div className="hidden sm:block h-6 w-px bg-[rgba(71,139,255,0.2)]" />
          <span className="text-sm text-[rgba(229,232,237,0.5)] hidden sm:inline">
            {greeting()}, {firstName} 👋
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[rgba(229,232,237,0.4)] hidden md:inline capitalize">
            {todayLabel()}
          </span>
          <div className="hidden md:block h-6 w-px bg-[rgba(71,139,255,0.2)]" />
          <NotificationBell />
          <button className="h-8 w-8 rounded-full bg-[rgba(71,139,255,0.2)] flex items-center justify-center text-xs font-bold text-[#478BFF]"
            onClick={() => go("/perfil")}>
            {firstName[0]?.toUpperCase()}
          </button>
          {isMobile && (
            <button className="p-2 hover:bg-[rgba(71,139,255,0.1)]"
              onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={20} className="text-[#E5E8ED]" /> : <Menu size={20} className="text-[#E5E8ED]" />}
            </button>
          )}
        </div>
      </header>

      {/* mobile menu */}
      {isMobile && mobileMenu && (
        <div className="fixed inset-0 z-40 bg-[rgba(13,14,20,0.95)] pt-20 px-4 overflow-y-auto">
          {[...finLinks, ...cpLinks, ...analyticsLinks].map((l) => (
            <button key={l.route} onClick={() => { go(l.route); setMobileMenu(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#E5E8ED] hover:bg-[rgba(71,139,255,0.1)] transition-colors">
              <l.icon size={18} className="text-[#478BFF]" />
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* ── BENTO GRID ───────────────────────── */}
      <main className="home-grid">
        {/* Card 1 – Central de Controle */}
        <Glass className="col-span-12 lg:col-span-8 min-h-[220px]" delay={100}>
          <div className="flex flex-col justify-between h-full relative z-10">
            <div>
              <h1 className="text-2xl sm:text-[32px] font-light text-[#E5E8ED] leading-tight">Central de Controle</h1>
              <p className="text-sm text-[rgba(229,232,237,0.5)] mt-1">Tudo que importa, em um lugar.</p>
              <div className="h-px w-16 bg-[rgba(71,139,255,0.3)] mt-4 mb-4" />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { emoji: "💰", label: "MRR", value: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { emoji: "📊", label: "Pipeline", value: `${pipelineCount} negócio${pipelineCount !== 1 ? "s" : ""}` },
                { emoji: "💬", label: "Msgs hoje", value: String(msgsToday) },
                { emoji: "🔔", label: "Cobranças", value: `${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}` },
              ].map((k) => (
                <div key={k.label} className="kpi-pill">
                  <span>{k.emoji}</span>
                  <span className="text-[rgba(229,232,237,0.5)] text-xs">{k.label}:</span>
                  <span className="text-[#E5E8ED] text-xs font-medium">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* abstract decoration */}
          <div className="absolute top-4 right-4 opacity-[0.08] pointer-events-none">
            <div className="w-32 h-32 rounded-full border-2 border-[#478BFF]" />
            <div className="w-20 h-20 rounded-full border border-[#478BFF] absolute -top-4 -right-2" />
          </div>
        </Glass>

        {/* Card 2 – Financeiro */}
        <Glass className="col-span-12 lg:col-span-4 min-h-[220px] border-[rgba(71,139,255,0.20)]!" delay={180}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#478BFF] mb-3">Financeiro</p>
          <div className="space-y-1">
            {finLinks.map((l) => (
              <button key={l.route} onClick={() => go(l.route)}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[#E5E8ED] hover:bg-[rgba(71,139,255,0.08)] transition-all group">
                <l.icon size={16} className="text-[rgba(229,232,237,0.5)] group-hover:text-[#478BFF] transition-colors" />
                <span>{l.label}</span>
                {l.badge ? (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-[10px] font-bold text-white">{l.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[rgba(229,232,237,0.3)] mt-3">6 módulos disponíveis</p>
        </Glass>

        {/* Card 3 – Clientes & Produtos */}
        <Glass className="col-span-12 sm:col-span-6 lg:col-span-4 min-h-[170px]" delay={260}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#478BFF] mb-4">Clientes & Produtos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cpLinks.map((l) => (
              <button key={l.route} onClick={() => go(l.route)}
                className="flex flex-col items-center gap-2 py-3 hover:bg-[rgba(71,139,255,0.08)] hover:scale-105 transition-all">
                <l.icon size={22} className="text-[rgba(229,232,237,0.5)]" />
                <span className="text-xs text-[rgba(229,232,237,0.6)]">{l.label}</span>
              </button>
            ))}
          </div>
        </Glass>

        {/* Card 4 – Analytics */}
        <Glass className="col-span-12 sm:col-span-6 lg:col-span-4 min-h-[170px]" delay={260}
          onClick={() => go("/dashboard")}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#478BFF] mb-4">Analytics</p>
          {/* animated bars */}
          <div className="flex items-end gap-1.5 h-14 mb-4">
            {[40, 65, 50, 80, 55, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-[rgba(71,139,255,0.25)] animate-bar-grow"
                style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {analyticsLinks.map((l, i) => (
              <button key={l.route} onClick={(e) => { e.stopPropagation(); go(l.route); }}
                className={`text-xs px-3 py-1.5 transition-colors ${i === 0 ? "bg-[rgba(71,139,255,0.15)] text-[#478BFF]" : "text-[rgba(229,232,237,0.5)] hover:text-[#478BFF]"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </Glass>

        {/* Card 5 – Atividade Recente */}
        <Glass className="col-span-12 lg:col-span-4 min-h-[170px]" delay={260}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#478BFF] mb-3">Atividade Recente</p>
          <div className="space-y-3">
            {(activity.length > 0 ? activity : [
              { text: "Nenhuma atividade", time: "—" },
            ]).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-[rgba(71,139,255,0.12)] flex items-center justify-center text-[10px] text-[#478BFF] font-bold">
                  {a.text[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#E5E8ED] truncate">{a.text}</p>
                </div>
                <span className="text-[10px] text-[rgba(229,232,237,0.4)] shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
          <button onClick={() => go("/reports")}
            className="text-xs text-[#478BFF] mt-3 hover:underline">Ver tudo →</button>
        </Glass>

        {/* Card 6 – Prospecção */}
        <Glass className="col-span-12 lg:col-span-8 min-h-[90px] home-cta-card" delay={340}>
          <div className="flex items-center gap-4 h-full">
            <Rocket size={28} className="text-[#478BFF] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E5E8ED]">Prospecção ativa</p>
              <p className="text-xs text-[rgba(229,232,237,0.5)]">Busque leads por segmento agora</p>
            </div>
            <button onClick={() => go("/intelligence")}
              className="shrink-0 px-4 py-2 rounded-[10px] bg-[#478BFF] text-[#0D0E14] text-sm font-semibold hover:bg-[#5A9BFF] transition-colors">
              Abrir Prospecção →
            </button>
          </div>
        </Glass>

        {/* Card 7 – Sistema */}
        <Glass className="col-span-12 lg:col-span-4 min-h-[90px]" delay={340}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#478BFF] mb-2">Sistema</p>
          <div className="flex gap-4">
            {[
              { icon: Users, label: "Usuários", route: "/usuarios" },
              { icon: Settings, label: "Configurações", route: "/settings" },
              { icon: Plug, label: "Integrações", route: "/integracoes" },
            ].map((l) => (
              <button key={l.label} onClick={() => go(l.route)}
                className="flex items-center gap-2 text-xs text-[rgba(229,232,237,0.6)] hover:text-[#478BFF] transition-colors">
                <l.icon size={14} /> {l.label}
              </button>
            ))}
          </div>
        </Glass>
      </main>

      {/* ── DOCK ─────────────────────────────── */}
      {!isMobile && (
        <nav className="home-dock glass-tabbar">
          {dock.map((item, i) => {
            const showDivider = i > 0 && dock[i - 1].group !== item.group;
            return (
              <div key={item.route} className="flex items-center">
                {showDivider && <div className="h-8 w-px bg-[rgba(71,139,255,0.2)] mx-1" />}
                <div className="relative group">
                  <button onClick={() => go(item.route)}
                    className="dock-icon">
                    <item.icon size={20} />
                  </button>
                  {/* tooltip */}
                  <div className="dock-tooltip">{item.label}</div>
                  {/* badge */}
                  {item.badge ? (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}
