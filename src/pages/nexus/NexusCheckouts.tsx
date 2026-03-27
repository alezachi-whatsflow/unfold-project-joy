import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, ExternalLink, Search, RefreshCcw, Plus, Link2, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/contexts/ProductContext";

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
            className="w-full bg-background border border-border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "paid", "expired", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold border transition-all ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
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
  const { products } = useProducts();
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Products from catalog ──────────────────────────────────────────────────
  const basePlans = useMemo(
    () => products.filter(p => p.category === "plan_base" && p.status === "active"),
    [products]
  );
  const oneTimeProducts = useMemo(
    () => products.filter(p => p.billingCycle === "one_time" && p.status === "active"),
    [products]
  );
  const addonProducts = useMemo(
    () => products.filter(p => p.category === "addon_technology" && p.status === "active"),
    [products]
  );

  // ── Asaas integrations ──────────────────────────────────────────────────────
  const { data: asaasConnections } = useQuery({
    queryKey: ["asaas-connections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("asaas_connections")
        .select("id, environment, is_active, api_key_hint")
        .eq("is_active", true);
      return data || [];
    },
  });
  const hasMultipleConnections = (asaasConnections?.length || 0) > 1;

  // ── Form state ──────────────────────────────────────────────────────────────
  const defaultPlan = basePlans[0]?.id || "";
  const [form, setForm] = useState({
    checkout_type: "new_account",
    buyer_email: "",
    company_name: "",
    buyer_cpf_cnpj: "",
    buyer_phone: "",
    plan_product_id: defaultPlan,
    custom_price: 0,
    is_custom: false,
    selected_addons: [] as string[],   // product ids of selected addons
    selected_onetimes: [] as string[], // product ids of selected one-time products
    extra_attendants: 0,
    extra_web: 0,
    extra_meta: 0,
    asaas_connection_id: asaasConnections?.[0]?.id || "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Sync default plan once products load
  useMemo(() => {
    if (basePlans.length > 0 && !form.plan_product_id) {
      setForm(f => ({ ...f, plan_product_id: basePlans[0].id }));
    }
  }, [basePlans]);

  const selectedPlan = useMemo(
    () => basePlans.find(p => p.id === form.plan_product_id),
    [basePlans, form.plan_product_id]
  );

  const monthly_value = useMemo(() => {
    const base = form.is_custom ? form.custom_price : (selectedPlan?.price || 0);
    const addons = addonProducts
      .filter(p => form.selected_addons.includes(p.id))
      .reduce((s, p) => s + p.price, 0);
    return base + addons;
  }, [form, selectedPlan, addonProducts]);

  const setup_fee = useMemo(
    () => oneTimeProducts
      .filter(p => form.selected_onetimes.includes(p.id))
      .reduce((s, p) => s + p.price, 0),
    [form.selected_onetimes, oneTimeProducts]
  );

  const first_charge = monthly_value + setup_fee;

  function toggleAddon(id: string) {
    setForm(f => ({
      ...f,
      selected_addons: f.selected_addons.includes(id)
        ? f.selected_addons.filter(a => a !== id)
        : [...f.selected_addons, id],
    }));
  }

  function toggleOnetime(id: string) {
    setForm(f => ({
      ...f,
      selected_onetimes: f.selected_onetimes.includes(id)
        ? f.selected_onetimes.filter(a => a !== id)
        : [...f.selected_onetimes, id],
    }));
  }

  async function handleSave() {
    if (!form.buyer_email.trim()) {
      toast({ title: "Informe o e-mail do comprador", variant: "destructive" }); return;
    }
    if (!selectedPlan && !form.is_custom) {
      toast({ title: "Selecione um plano", variant: "destructive" }); return;
    }

    setSaving(true);
    try {
      const planName = form.is_custom ? "personalizado" : (selectedPlan?.name.toLowerCase().replace(/\s+/g, "_") || "personalizado");
      const hasImplantacao = oneTimeProducts.some(p => p.name.toLowerCase().includes("implantação") && form.selected_onetimes.includes(p.id));

      const { data, error } = await supabase
        .from("checkout_sessions")
        .insert({
          checkout_type: form.checkout_type,
          buyer_email: form.buyer_email.trim(),
          company_name: form.company_name.trim() || null,
          buyer_cpf_cnpj: form.buyer_cpf_cnpj.trim() || null,
          buyer_phone: form.buyer_phone.trim() || null,
          plan: planName,
          extra_attendants: form.extra_attendants,
          extra_devices_web: form.extra_web,
          extra_devices_meta: form.extra_meta,
          has_ai_module: form.selected_addons.some(id => addonProducts.find(p => p.id === id && p.category === "addon_technology")),
          has_implantacao_starter: hasImplantacao,
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
      buyer_cpf_cnpj: "", buyer_phone: "",
      plan_product_id: basePlans[0]?.id || "", custom_price: 0, is_custom: false,
      selected_addons: [], selected_onetimes: [],
      extra_attendants: 0, extra_web: 0, extra_meta: 0,
      asaas_connection_id: asaasConnections?.[0]?.id || "",
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
          <div className="space-y-4 py-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
              <Check className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Checkout criado com sucesso!</p>
              <p className="text-xs text-muted-foreground">Copie o link abaixo e envie ao cliente.</p>
            </div>
            <div className="flex items-center gap-2 bg-muted px-3 py-2">
              <p className="text-xs font-mono flex-1 truncate text-muted-foreground">{createdLink}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button className="w-full" onClick={copyLink} variant={copied ? "outline" : "default"}>
              {copied ? <><Check className="h-4 w-4 mr-2 text-emerald-500" />Link copiado!</> : <><Copy className="h-4 w-4 mr-2" />Copiar link</>}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de checkout</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[{ v: "new_account", l: "Nova Conta" }, { v: "upsell", l: "Upsell" }, { v: "renewal", l: "Renovação" }].map(t => (
                  <button key={t.v} type="button" onClick={() => set("checkout_type", t.v)}
                    className={`px-2 py-2 text-xs font-semibold border transition-all ${form.checkout_type === t.v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-3 bg-muted/30 p-3 border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Cliente</p>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail *</Label>
                <Input type="email" placeholder="cliente@empresa.com" value={form.buyer_email} onChange={e => set("buyer_email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da empresa</Label>
                <Input placeholder="Empresa Ltda" value={form.company_name} onChange={e => set("company_name", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">CNPJ / CPF</Label>
                  <Input placeholder="00.000.000/0000-00" value={form.buyer_cpf_cnpj} onChange={e => set("buyer_cpf_cnpj", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input placeholder="(11) 99999-9999" value={form.buyer_phone} onChange={e => set("buyer_phone", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Planos — dinâmicos do catálogo de Produtos */}
            <div className="space-y-3 bg-muted/30 p-3 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Plano</p>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form.is_custom} onChange={e => set("is_custom", e.target.checked)} className="rounded" />
                  Valor personalizado
                </label>
              </div>
              {form.is_custom ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor mensal (R$)</Label>
                  <Input type="number" min={0} value={form.custom_price} onChange={e => set("custom_price", Number(e.target.value))} />
                </div>
              ) : (
                <div className="space-y-2">
                  {basePlans.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum plano ativo no catálogo.</p>
                  )}
                  {basePlans.map(p => (
                    <button key={p.id} type="button" onClick={() => set("plan_product_id", p.id)}
                      className={`w-full px-3 py-2.5 text-xs font-semibold border text-left transition-all ${form.plan_product_id === p.id ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{p.name}</span>
                        <span className={`text-xs font-mono ${form.plan_product_id === p.id ? "text-primary" : "text-muted-foreground"}`}>{formatBRL(p.price)}/mês</span>
                      </div>
                      {p.description && <span className="text-[10px] opacity-60 line-clamp-1">{p.description}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add-ons (addon_technology) */}
            {addonProducts.length > 0 && (
              <div className="space-y-2 bg-muted/30 p-3 border border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Add-ons</p>
                {addonProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBRL(p.price)}/mês</p>
                    </div>
                    <Switch checked={form.selected_addons.includes(p.id)} onCheckedChange={() => toggleAddon(p.id)} />
                  </div>
                ))}
              </div>
            )}

            {/* Extras numéricos */}
            <div className="space-y-2 bg-muted/30 p-3 border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Recursos extras</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: "Atendentes", key: "extra_attendants" },
                  { label: "Web extras",  key: "extra_web" },
                  { label: "Meta extras", key: "extra_meta" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px]">{f.label}</Label>
                    <Input type="number" min={0} value={(form as any)[f.key]} onChange={e => set(f.key, Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos avulsos (one_time) */}
            {oneTimeProducts.length > 0 && (
              <div className="space-y-2 bg-muted/30 p-3 border border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Serviços avulsos</p>
                {oneTimeProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBRL(p.price)} (taxa única)</p>
                    </div>
                    <Switch checked={form.selected_onetimes.includes(p.id)} onCheckedChange={() => toggleOnetime(p.id)} />
                  </div>
                ))}
              </div>
            )}

            {/* Gateway de pagamento */}
            <div className="space-y-2 bg-muted/30 p-3 border border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Gateway de Pagamento
              </p>
              {(asaasConnections?.length || 0) === 0 ? (
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Nenhuma integração de pagamento ativa. Configure o Asaas nas Configurações.
                </div>
              ) : hasMultipleConnections ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Selecione a integração</Label>
                  <div className="space-y-1.5">
                    {asaasConnections!.map(c => (
                      <button key={c.id} type="button" onClick={() => set("asaas_connection_id", c.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs border transition-all ${form.asaas_connection_id === c.id ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                        <span className="font-semibold">Asaas — {c.environment === "sandbox" ? "Sandbox (Testes)" : "Produção"}</span>
                        <span className="font-mono opacity-60">****{c.api_key_hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Asaas — {asaasConnections![0].environment === "sandbox" ? "Sandbox (Testes)" : "Produção"} ****{asaasConnections![0].api_key_hint}
                </div>
              )}
            </div>

            {/* Resumo */}
            <div className="border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>MRR (recorrente)</span>
                <span className="font-mono font-bold text-emerald-400">{formatBRL(monthly_value)}</span>
              </div>
              {setup_fee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Serviços avulsos</span>
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
              <Button onClick={handleSave} disabled={saving || (asaasConnections?.length === 0)} className="gap-2">
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
