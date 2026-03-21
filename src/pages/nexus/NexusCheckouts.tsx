import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ExternalLink, Search, RefreshCcw, Plus, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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

const PLANS = [
  { value: "starter",      label: "Starter",      price: 197 },
  { value: "profissional", label: "Profissional",  price: 397 },
  { value: "enterprise",   label: "Enterprise",    price: 797 },
  { value: "custom",       label: "Personalizado", price: 0   },
];

const SETUP_FEE = 2000;
const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function NexusCheckouts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

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
    toast({ title: "Link copiado!", description: link });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Checkouts</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de todas as sessões de checkout e ativações.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Checkout
          </Button>
        </div>
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
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Link2 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Nenhum checkout encontrado.</p>
                    <p className="text-xs opacity-60">Clique em <strong>Novo Checkout</strong> para gerar um link e enviar ao cliente.</p>
                  </div>
                </td>
              </tr>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Copiar link de checkout" onClick={() => copyLink(s.id)}>
                        {copiedId === s.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
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

      <CreateCheckoutModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          refetch();
          copyLink(id);
        }}
      />
    </div>
  );
}

// ─── Create Checkout Modal ────────────────────────────────────────────────────
function CreateCheckoutModal({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (sessionId: string) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    checkout_type: "new_account",
    buyer_email: "",
    company_name: "",
    plan: "profissional",
    custom_price: 397,
    has_implantacao: false,
    extra_attendants: 0,
    extra_web: 0,
    extra_meta: 0,
    has_ai_module: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const planPrice = useMemo(() => {
    const p = PLANS.find(p => p.value === form.plan);
    return p?.value === "custom" ? form.custom_price : (p?.price || 0);
  }, [form.plan, form.custom_price]);

  const monthly_value = useMemo(() => planPrice, [planPrice]);
  const setup_fee = form.has_implantacao ? SETUP_FEE : 0;
  const first_charge = monthly_value + setup_fee;

  async function handleSave() {
    if (!form.buyer_email.trim()) {
      toast({ title: "Informe o e-mail do comprador", variant: "destructive" }); return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("checkout_sessions")
        .insert({
          checkout_type: form.checkout_type,
          buyer_email: form.buyer_email.trim(),
          company_name: form.company_name.trim() || null,
          plan: form.plan,
          extra_attendants: form.extra_attendants,
          extra_devices_web: form.extra_web,
          extra_devices_meta: form.extra_meta,
          has_ai_module: form.has_ai_module,
          has_implantacao_starter: form.has_implantacao,
          monthly_value,
          setup_fee,
          first_charge,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      const link = `${window.location.origin}/checkout?session=${data.id}`;
      setCreatedLink(link);
      onCreated(data.id);
    } catch (err: any) {
      toast({ title: "Erro ao criar checkout", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleClose() {
    setCreatedLink(null);
    setCopied(false);
    setForm({
      checkout_type: "new_account", buyer_email: "", company_name: "",
      plan: "profissional", custom_price: 397, has_implantacao: false,
      extra_attendants: 0, extra_web: 0, extra_meta: 0, has_ai_module: false,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Novo Checkout
          </DialogTitle>
        </DialogHeader>

        {createdLink ? (
          /* ── Link gerado ── */
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
              <Check className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Checkout criado com sucesso!</p>
              <p className="text-xs text-muted-foreground">Copie o link abaixo e envie ao cliente.</p>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <p className="text-xs font-mono flex-1 truncate text-muted-foreground">{createdLink}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button className="w-full" onClick={copyLink} variant={copied ? "outline" : "default"}>
              {copied ? <><Check className="h-4 w-4 mr-2 text-emerald-500" /> Link copiado!</> : <><Copy className="h-4 w-4 mr-2" /> Copiar link</>}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          /* ── Formulário ── */
          <div className="space-y-4">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de checkout</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "new_account", l: "Nova Conta" },
                  { v: "upsell",      l: "Upsell" },
                  { v: "renewal",     l: "Renovação" },
                ].map(t => (
                  <button key={t.v} type="button" onClick={() => set("checkout_type", t.v)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all ${form.checkout_type === t.v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Cliente</p>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail *</Label>
                <Input type="email" placeholder="cliente@empresa.com" value={form.buyer_email} onChange={e => set("buyer_email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da empresa</Label>
                <Input placeholder="Empresa Ltda" value={form.company_name} onChange={e => set("company_name", e.target.value)} />
              </div>
            </div>

            {/* Plano */}
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Plano</p>
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map(p => (
                  <button key={p.value} type="button" onClick={() => set("plan", p.value)}
                    className={`px-2 py-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${form.plan === p.value ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    <span className="block font-bold">{p.label}</span>
                    {p.value !== "custom" && <span className="text-[10px] opacity-70">R$ {p.price}/mês</span>}
                  </button>
                ))}
              </div>
              {form.plan === "custom" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor mensal (R$)</Label>
                  <Input type="number" min={0} value={form.custom_price} onChange={e => set("custom_price", Number(e.target.value))} />
                </div>
              )}
            </div>

            {/* Add-ons */}
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Recursos adicionais</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Atendentes extras</Label>
                  <Input type="number" min={0} value={form.extra_attendants} onChange={e => set("extra_attendants", Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Web extras</Label>
                  <Input type="number" min={0} value={form.extra_web} onChange={e => set("extra_web", Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meta extras</Label>
                  <Input type="number" min={0} value={form.extra_meta} onChange={e => set("extra_meta", Number(e.target.value))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Módulo I.A.</Label>
                <Switch checked={form.has_ai_module} onCheckedChange={v => set("has_ai_module", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Implantação Starter</Label>
                  <p className="text-[10px] text-muted-foreground">+R$ 2.000 (taxa única)</p>
                </div>
                <Switch checked={form.has_implantacao} onCheckedChange={v => set("has_implantacao", v)} />
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>MRR (recorrente)</span>
                <span className="font-mono font-bold text-emerald-400">{formatBRL(monthly_value)}</span>
              </div>
              {setup_fee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Implantação Starter</span>
                  <span className="font-mono font-bold text-blue-400">{formatBRL(setup_fee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground">
                <span>1ª cobrança</span>
                <span className="font-mono">{formatBRL(first_charge)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Gerar link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
