import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, DollarSign } from "lucide-react";
import { format } from "date-fns";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CATEGORIES = ["Pessoal", "Software", "Marketing", "Infraestrutura", "Impostos", "Comissões", "Outros"];

interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ description: "", value: "", date: format(new Date(), "yyyy-MM-dd"), category: "Outros", is_recurring: false, recurrence_period: "" });
  const [saving, setSaving] = useState(false);

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
    setForm({ description: "", value: "", date: format(new Date(), "yyyy-MM-dd"), category: "Outros", is_recurring: false, recurrence_period: "" });
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ description: e.description, value: String(e.value), date: e.date, category: e.category || "Outros", is_recurring: e.is_recurring, recurrence_period: e.recurrence_period || "" });
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Servidor AWS" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Atualizar" : "Criar"}
              </Button>
            </div>
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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.category || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">R$ {Number(e.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
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
