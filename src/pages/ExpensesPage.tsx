import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { DEFAULT_COST_LINES } from "@/lib/costLineTemplates";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CATEGORIES = ["Pessoal", "Software", "Marketing", "Infraestrutura", "Impostos", "Comissões", "Despesas Comerciais", "Despesas Financeiras", "Custos de Prestação do Serviço (CSP)", "Salários / Pessoal", "General & Administrative", "Outros"];
const INSTALLMENT_OPTIONS = ["À vista", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "11x", "12x"];
const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Transferência", "Dinheiro", "Outro"];

interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  supplier: string | null;
  cost_center: string | null;
  reference_code: string | null;
  installments: string | null;
  due_date: string | null;
  payment_method: string | null;
  payment_account: string | null;
  is_paid: boolean;
  is_scheduled: boolean;
  notes: string | null;
}

const defaultForm = {
  description: "",
  value: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category: "Outros",
  is_recurring: false,
  recurrence_period: "",
  supplier: "",
  cost_center: "",
  reference_code: "",
  installments: "À vista",
  due_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "",
  payment_account: "",
  is_paid: false,
  is_scheduled: false,
  notes: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [descQuery, setDescQuery] = useState("");
  const [descPopoverOpen, setDescPopoverOpen] = useState(false);

  // Build suggestion list from existing expenses + cost line templates
  const descriptionSuggestions = useMemo(() => {
    const fromExpenses = expenses.map((e) => e.description);
    const fromTemplates = DEFAULT_COST_LINES.map((t) => t.subcategory);
    const unique = Array.from(new Set([...fromExpenses, ...fromTemplates]));
    return unique.sort();
  }, [expenses]);

  const filteredSuggestions = useMemo(() => {
    if (descQuery.length < 3) return [];
    const q = descQuery.toLowerCase();
    return descriptionSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 10);
  }, [descQuery, descriptionSuggestions]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asaas_expenses")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("date", { ascending: false });
    if (error) { toast.error("Erro ao carregar despesas"); console.error(error); }
    setExpenses((data || []) as Expense[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultForm, date: format(new Date(), "yyyy-MM-dd"), due_date: format(new Date(), "yyyy-MM-dd") });
    setDescQuery("");
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description,
      value: String(e.value),
      date: e.date,
      category: e.category || "Outros",
      is_recurring: e.is_recurring,
      recurrence_period: e.recurrence_period || "",
      supplier: e.supplier || "",
      cost_center: e.cost_center || "",
      reference_code: e.reference_code || "",
      installments: e.installments || "À vista",
      due_date: e.due_date || e.date,
      payment_method: e.payment_method || "",
      payment_account: e.payment_account || "",
      is_paid: e.is_paid ?? false,
      is_scheduled: e.is_scheduled ?? false,
      notes: e.notes || "",
    });
    setDescQuery(e.description);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.value) { toast.error("Preencha descrição e valor"); return; }
    setSaving(true);
    const payload = {
      tenant_id: TENANT_ID,
      description: form.description,
      value: parseFloat(form.value),
      date: form.date,
      category: form.category,
      is_recurring: form.is_recurring,
      recurrence_period: form.is_recurring ? form.recurrence_period : null,
      supplier: form.supplier || null,
      cost_center: form.cost_center || null,
      reference_code: form.reference_code || null,
      installments: form.installments,
      due_date: form.due_date || form.date,
      payment_method: form.payment_method || null,
      payment_account: form.payment_account || null,
      is_paid: form.is_paid,
      is_scheduled: form.is_scheduled,
      notes: form.notes || null,
    };

    if (editing) {
      const { error } = await supabase.from("asaas_expenses").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Despesa atualizada");
    } else {
      const { error } = await supabase.from("asaas_expenses").insert(payload);
      if (error) toast.error("Erro ao criar"); else toast.success("Despesa criada");
    }
    setSaving(false);
    setDialogOpen(false);
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("asaas_expenses").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Despesa excluída"); loadExpenses(); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as despesas da empresa</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>

            {/* Informações do lançamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informações do lançamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fornecedor + Data competência */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome do fornecedor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de competência *</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>

                {/* Descrição com autocomplete + Valor */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Descrição *</Label>
                    <Popover open={descPopoverOpen && filteredSuggestions.length > 0} onOpenChange={setDescPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Input
                          value={form.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm({ ...form, description: val });
                            setDescQuery(val);
                            setDescPopoverOpen(val.length >= 3);
                          }}
                          onFocus={() => { if (form.description.length >= 3) setDescPopoverOpen(true); }}
                          placeholder="Ex: Servidor AWS"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command>
                          <CommandList>
                            <CommandEmpty>Nenhuma sugestão</CommandEmpty>
                            <CommandGroup heading="Sugestões">
                              {filteredSuggestions.map((s) => (
                                <CommandItem
                                  key={s}
                                  onSelect={() => {
                                    setForm({ ...form, description: s });
                                    setDescQuery(s);
                                    setDescPopoverOpen(false);
                                  }}
                                >
                                  {s}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" />
                  </div>
                </div>

                {/* Categoria + Centro de custo + Código ref */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Centro de custo</Label>
                    <Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} placeholder="Ex: Operações" />
                  </div>
                  <div className="space-y-2">
                    <Label>Código de referência</Label>
                    <Input value={form.reference_code} onChange={(e) => setForm({ ...form, reference_code: e.target.value })} placeholder="Ex: NF-001" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Repetir lançamento + Condição de pagamento */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Label>Repetir lançamento?</Label>
                  <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                </div>
                {form.is_recurring && (
                  <div className="space-y-2">
                    <Label>Período de recorrência</Label>
                    <Select value={form.recurrence_period} onValueChange={(v) => setForm({ ...form, recurrence_period: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <h3 className="font-medium text-sm pt-2">Condição de pagamento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Parcelamento *</Label>
                    <Select value={form.installments} onValueChange={(v) => setForm({ ...form, installments: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento *</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta de pagamento</Label>
                    <Input value={form.payment_account} onChange={(e) => setForm({ ...form, payment_account: e.target.value })} placeholder="Ex: Santander CC" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: !!v })} />
                    <Label className="cursor-pointer">Pago</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.is_scheduled} onCheckedChange={(v) => setForm({ ...form, is_scheduled: !!v })} />
                    <Label className="cursor-pointer">Agendado</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes">Observações</TabsTrigger>
              </TabsList>
              <TabsContent value="notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Descreva observações relevantes sobre esse lançamento financeiro"
                  rows={3}
                />
              </TabsContent>
            </Tabs>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-destructive" />
            Total: R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma despesa cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.category || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.supplier || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">R$ {Number(e.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center text-xs">
                      {e.is_paid ? <span className="text-emerald-500">Pago</span> : e.is_scheduled ? <span className="text-yellow-500">Agendado</span> : <span className="text-muted-foreground">Pendente</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
