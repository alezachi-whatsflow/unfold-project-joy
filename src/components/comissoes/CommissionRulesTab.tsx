import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Settings2, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/calculations";
import type { CommissionRule, InstallmentRate } from "@/types/commissions";
import { toast } from "sonner";
import { useTenantId } from "@/hooks/useTenantId";

const EMPTY_RULE: Omit<CommissionRule, "id" | "created_at" | "updated_at" | "tenant_id"> = {
  name: "",
  product_id: null,
  product_name: "",
  product_price: 0,
  rule_type: "installment_based",
  installment_rates: [
    { installment: 1, percent: 23, type: "split_direto" },
    { installment: 2, percent: 23, type: "split_direto" },
    { installment: 3, percent: 23, type: "split_direto" },
  ],
  recurring_rate_min: 1.5,
  recurring_rate_max: 5,
  recurring_start_installment: 5,
  is_active: true,
  notes: null,
};

export default function CommissionRulesTab() {
  const tenantId = useTenantId();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [form, setForm] = useState(EMPTY_RULE);

  const loadRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("commission_rules")
      .select("*")
      .eq("tenant_id", tenantId || "")
      .order("created_at", { ascending: false });
    setRules((data || []) as CommissionRule[]);
    setLoading(false);
  };

  useEffect(() => { loadRules(); }, []);

  const openNew = () => {
    setEditingRule(null);
    setForm(EMPTY_RULE);
    setDialogOpen(true);
  };

  const openEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      product_id: rule.product_id,
      product_name: rule.product_name,
      product_price: rule.product_price,
      rule_type: rule.rule_type,
      installment_rates: rule.installment_rates || [],
      recurring_rate_min: rule.recurring_rate_min,
      recurring_rate_max: rule.recurring_rate_max,
      recurring_start_installment: rule.recurring_start_installment,
      is_active: rule.is_active,
      notes: rule.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.product_name) {
      toast.error("Preencha nome e produto");
      return;
    }

    const payload = {
      ...form,
      tenant_id: tenantId || "",
      updated_at: new Date().toISOString(),
    };

    if (editingRule) {
      const { error } = await supabase.from("commission_rules").update(payload).eq("id", editingRule.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Regra atualizada");
    } else {
      const { error } = await supabase.from("commission_rules").insert(payload);
      if (error) { toast.error("Erro ao criar regra"); return; }
      toast.success("Regra criada");
    }
    setDialogOpen(false);
    loadRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra de comissão?")) return;
    await supabase.from("commission_rules").delete().eq("id", id);
    toast.success("Regra excluída");
    loadRules();
  };

  const addInstallment = () => {
    const next = form.installment_rates.length + 1;
    setForm({
      ...form,
      installment_rates: [...form.installment_rates, { installment: next, percent: 0, type: "split_direto" }],
    });
  };

  const removeInstallment = (idx: number) => {
    setForm({
      ...form,
      installment_rates: form.installment_rates.filter((_, i) => i !== idx).map((r, i) => ({ ...r, installment: i + 1 })),
    });
  };

  const updateInstallment = (idx: number, field: keyof InstallmentRate, value: any) => {
    const updated = [...form.installment_rates];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, installment_rates: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Regras de Comissão</h2>
          <p className="text-xs text-muted-foreground">Configure modelos de comissão por produto/serviço</p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Nova Regra
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                <TableHead className="text-xs text-muted-foreground">Produto</TableHead>
                <TableHead className="text-xs text-muted-foreground">Preço</TableHead>
                <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs text-muted-foreground">Parcelas Split</TableHead>
                <TableHead className="text-xs text-muted-foreground">Recorrente</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    {loading ? "Carregando..." : "Nenhuma regra cadastrada. Crie a primeira regra de comissão."}
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="border-border">
                    <TableCell className="text-xs font-medium">{rule.name}</TableCell>
                    <TableCell className="text-xs">{rule.product_name}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(rule.product_price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {rule.rule_type === "installment_based" ? "Por Parcela" : rule.rule_type === "fixed_percent" ? "% Fixo" : "Valor Fixo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(rule.installment_rates || []).map((r) => `${r.installment}ª: ${r.percent}%`).join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {rule.recurring_rate_min > 0 ? `${rule.recurring_rate_min}% - ${rule.recurring_rate_max}% (a partir da ${rule.recurring_start_installment}ª)` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                        {rule.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Exemplo de regra pré-definida */}
      <Card className="border-border border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Exemplo: Plano Profissional (R$ 359,00)
          </CardTitle>
          <CardDescription className="text-xs">Modelo de comissão padrão para consultores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-md border border-border p-2">
              <p className="font-medium text-foreground mb-1">Split Direto (Parcelas 1-3)</p>
              <p>1ª parcela: <span className="text-primary font-semibold">23%</span> = {formatCurrency(359 * 0.23)}</p>
              <p>2ª parcela: <span className="text-primary font-semibold">23%</span> = {formatCurrency(359 * 0.23)}</p>
              <p>3ª parcela: <span className="text-primary font-semibold">23%</span> = {formatCurrency(359 * 0.23)}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="font-medium text-foreground mb-1">Recorrente (a partir da 5ª)</p>
              <p>Performance mínima: <span className="text-primary font-semibold">1,5%</span> = {formatCurrency(359 * 0.015)}</p>
              <p>Performance máxima: <span className="text-primary font-semibold">5%</span> = {formatCurrency(359 * 0.05)}</p>
              <p className="mt-1 text-[10px]">% definido pela performance de vendas do consultor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar regra */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Comissão"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome da Regra</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Comissão Plano Profissional" className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.rule_type} onValueChange={(v: any) => setForm({ ...form, rule_type: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installment_based">Por Parcela (progressivo)</SelectItem>
                    <SelectItem value="fixed_percent">Percentual Fixo</SelectItem>
                    <SelectItem value="fixed_value">Valor Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Produto / Serviço</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Ex: Plano Profissional" className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Preço (R$)</Label>
                <Input type="number" value={form.product_price} onChange={(e) => setForm({ ...form, product_price: parseFloat(e.target.value) || 0 })} className="text-xs" />
              </div>
            </div>

            {form.rule_type === "installment_based" && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold">Parcelas com Split Direto</Label>
                    <Button variant="outline" size="sm" onClick={addInstallment} className="text-[10px] h-7">
                      <Plus className="h-3 w-3 mr-1" /> Parcela
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.installment_rates.map((rate, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-md border border-border p-2">
                        <span className="text-xs text-muted-foreground w-16">{rate.installment}ª parcela</span>
                        <Input
                          type="number"
                          value={rate.percent}
                          onChange={(e) => updateInstallment(idx, "percent", parseFloat(e.target.value) || 0)}
                          className="text-xs w-20"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Select value={rate.type} onValueChange={(v: any) => updateInstallment(idx, "type", v)}>
                          <SelectTrigger className="text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="split_direto">Split Direto</SelectItem>
                            <SelectItem value="recorrente">Recorrente</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.product_price > 0 && (
                          <span className="text-xs text-primary ml-auto">= {formatCurrency(form.product_price * rate.percent / 100)}</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeInstallment(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" /> Comissão Recorrente (performance)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px]">A partir da parcela</Label>
                      <Input
                        type="number"
                        value={form.recurring_start_installment}
                        onChange={(e) => setForm({ ...form, recurring_start_installment: parseInt(e.target.value) || 5 })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">% Mínimo</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.recurring_rate_min}
                        onChange={(e) => setForm({ ...form, recurring_rate_min: parseFloat(e.target.value) || 0 })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">% Máximo</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.recurring_rate_max}
                        onChange={(e) => setForm({ ...form, recurring_rate_max: parseFloat(e.target.value) || 0 })}
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">Regra ativa</Label>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas internas sobre esta regra..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingRule ? "Salvar" : "Criar Regra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
