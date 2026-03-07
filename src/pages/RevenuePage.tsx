import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, TrendingUp, DollarSign, Clock, CheckCircle, Upload, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useAsaas } from "@/contexts/AsaasContext";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CATEGORIES = ["Mensalidade", "Consultoria", "Serviço Avulso", "Setup / Implantação", "Licença", "Comissão", "Outros"];
const BILLING_TYPES = ["PIX", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Transferência", "Dinheiro"];
const INSTALLMENT_OPTIONS = ["À vista", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "11x", "12x"];
const STATUS_OPTIONS = ["PENDING", "RECEIVED", "CONFIRMED", "OVERDUE", "CANCELLED"];

interface Revenue {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string | null;
  client_name: string | null;
  billing_type: string | null;
  installments: string | null;
  installment_number: number;
  installment_total: number;
  status: string | null;
  source: string | null;
  asaas_payment_id: string | null;
  payment_date: string | null;
  due_date: string | null;
  notes: string | null;
}

const defaultForm = {
  description: "",
  value: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category: "Serviço Avulso",
  client_name: "",
  billing_type: "PIX",
  installments: "À vista",
  status: "PENDING",
  due_date: "",
  notes: "",
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  RECEIVED: { label: "Recebido", variant: "default" },
  CONFIRMED: { label: "Confirmado", variant: "default" },
  PENDING: { label: "Pendente", variant: "secondary" },
  OVERDUE: { label: "Vencido", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
  RECEIVED_IN_CASH: { label: "Recebido", variant: "default" },
};

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { payments, customers, isSyncing, syncPayments } = useAsaas();

  const loadRevenues = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asaas_revenue")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("date", { ascending: false });
    if (error) { console.error(error); toast.error("Erro ao carregar receitas"); }
    else setRevenues((data || []) as Revenue[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadRevenues(); }, [loadRevenues]);

  // Suggestions from existing revenues
  const descSuggestions = useMemo(() => {
    const unique = new Set(revenues.map((r) => r.description));
    return Array.from(unique).slice(0, 20);
  }, [revenues]);

  const filteredSuggestions = useMemo(() => {
    if (form.description.length < 3) return [];
    const q = form.description.toLowerCase();
    return descSuggestions.filter((s) => s.toLowerCase().includes(q));
  }, [form.description, descSuggestions]);

  // KPIs
  const kpis = useMemo(() => {
    const total = revenues.reduce((s, r) => s + r.value, 0);
    const received = revenues.filter((r) => r.status === "RECEIVED" || r.status === "CONFIRMED" || r.status === "RECEIVED_IN_CASH").reduce((s, r) => s + r.value, 0);
    const pending = revenues.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.value, 0);
    const overdue = revenues.filter((r) => r.status === "OVERDUE").reduce((s, r) => s + r.value, 0);
    return { total, received, pending, overdue, count: revenues.length };
  }, [revenues]);

  const filteredRevenues = useMemo(() => {
    if (filter === "all") return revenues;
    return revenues.filter((r) => r.source === filter);
  }, [revenues, filter]);

  const handleSave = async () => {
    if (!form.description || !form.value) { toast.error("Preencha descrição e valor"); return; }
    setSaving(true);

    const installText = form.installments;
    const totalInstallments = installText === "À vista" ? 1 : parseInt(installText.replace("x", ""));
    const baseValue = parseFloat(form.value) / totalInstallments;

    try {
      for (let i = 1; i <= totalInstallments; i++) {
        const dueDate = form.due_date || form.date;
        const dueDateObj = new Date(dueDate);
        dueDateObj.setMonth(dueDateObj.getMonth() + (i - 1));

        await supabase.from("asaas_revenue").insert({
          tenant_id: TENANT_ID,
          description: totalInstallments > 1 ? `${form.description} (${i}/${totalInstallments})` : form.description,
          value: Math.round(baseValue * 100) / 100,
          date: form.date,
          category: form.category,
          client_name: form.client_name,
          billing_type: form.billing_type,
          installments: form.installments,
          installment_number: i,
          installment_total: totalInstallments,
          status: form.status,
          source: "manual",
          due_date: dueDateObj.toISOString().split("T")[0],
          notes: form.notes,
        });
      }
      toast.success(totalInstallments > 1 ? `${totalInstallments} parcelas criadas` : "Receita criada");
      setForm(defaultForm);
      setDialogOpen(false);
      loadRevenues();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar receita");
    } finally {
      setSaving(false);
    }
  };

  // Import from Asaas payments
  const importFromAsaas = async () => {
    if (payments.length === 0) { toast.error("Nenhuma cobrança do Asaas encontrada. Sincronize primeiro."); return; }
    setImporting(true);
    try {
      const existingIds = new Set(revenues.filter((r) => r.asaas_payment_id).map((r) => r.asaas_payment_id));
      const newPayments = payments.filter((p) => !existingIds.has(p.asaas_id));

      if (newPayments.length === 0) { toast.info("Todas as cobranças já foram importadas"); setImporting(false); return; }

      const customerMap = new Map(customers.map((c) => [c.asaas_id, c.name]));

      for (const p of newPayments) {
        await supabase.from("asaas_revenue").insert({
          tenant_id: TENANT_ID,
          description: p.description || "Cobrança Asaas",
          value: p.value,
          date: p.due_date,
          category: "Mensalidade",
          client_name: customerMap.get(p.asaas_customer_id || "") || "",
          billing_type: p.billing_type,
          installments: "À vista",
          installment_number: 1,
          installment_total: 1,
          status: p.status,
          source: "asaas",
          asaas_payment_id: p.asaas_id,
          payment_date: p.payment_date,
          due_date: p.due_date,
        });
      }
      toast.success(`${newPayments.length} receitas importadas do Asaas`);
      loadRevenues();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar do Asaas");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("asaas_revenue").delete().eq("id", id);
    toast.success("Receita removida");
    loadRevenues();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Receitas</h1>
          <p className="text-sm text-muted-foreground">Gestão centralizada de entradas financeiras — Asaas e avulsas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { syncPayments(); }} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} /> Sync Asaas
          </Button>
          <Button variant="outline" size="sm" onClick={importFromAsaas} disabled={importing}>
            <Upload className={`mr-2 h-4 w-4 ${importing ? "animate-spin" : ""}`} /> Importar Asaas
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova Receita</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Receita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Description with autocomplete */}
                <div className="space-y-1">
                  <Label>Descrição do lançamento</Label>
                  <Popover open={descOpen && filteredSuggestions.length > 0} onOpenChange={setDescOpen}>
                    <PopoverTrigger asChild>
                      <Input
                        value={form.description}
                        onChange={(e) => { setForm({ ...form, description: e.target.value }); setDescOpen(true); }}
                        placeholder="Ex: Consultoria estratégica"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Command>
                        <CommandList>
                          <CommandGroup heading="Sugestões">
                            {filteredSuggestions.map((s) => (
                              <CommandItem key={s} onSelect={() => { setForm({ ...form, description: s }); setDescOpen(false); }}>{s}</CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Cliente</Label>
                    <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Valor Total (R$)</Label>
                    <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="3000.00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Parcelamento</Label>
                    <Select value={form.installments} onValueChange={(v) => setForm({ ...form, installments: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INSTALLMENT_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Forma Pgto</Label>
                    <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BILLING_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Data Lançamento</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusMap[s]?.label || s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Detalhes adicionais..." />
                </div>

                {form.installments !== "À vista" && (
                  <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    <strong>{form.installments}</strong> de{" "}
                    <strong>{form.value ? fmt(parseFloat(form.value) / parseInt(form.installments.replace("x", ""))) : "R$ 0,00"}</strong>{" "}
                    — Total: <strong>{form.value ? fmt(parseFloat(form.value)) : "R$ 0,00"}</strong>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {form.installments !== "À vista" ? `Criar ${form.installments}` : "Criar Receita"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(kpis.total)}</div>
            <p className="text-xs text-muted-foreground">{kpis.count} lançamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmt(kpis.received)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{fmt(kpis.pending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fmt(kpis.overdue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="manual">Avulsas</TabsTrigger>
          <TabsTrigger value="asaas">Asaas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredRevenues.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Nenhuma receita encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRevenues.map((r) => {
                    const st = statusMap[r.status || ""] || { label: r.status, variant: "outline" as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">{r.description}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{r.client_name || "—"}</TableCell>
                        <TableCell>{r.category || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.value)}</TableCell>
                        <TableCell>{r.installment_total > 1 ? `${r.installment_number}/${r.installment_total}` : "—"}</TableCell>
                        <TableCell>{r.due_date || r.date}</TableCell>
                        <TableCell>{r.billing_type || "—"}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{r.source === "asaas" ? "Asaas" : "Manual"}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
