import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Save, Loader2, AlertTriangle, Building2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SlaRule {
  id: string;
  tenant_id: string;
  department_id: string | null;
  first_response_minutes: number;
  resolution_minutes: number;
  escalation_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

export default function SlaConfigPanel() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SlaRule | null>(null);
  const [form, setForm] = useState({
    department_id: "" as string,
    first_response_minutes: 5,
    resolution_minutes: 60,
    is_active: true,
  });

  // Fetch SLA rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["sla_rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("sla_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at");
      if (error) throw error;
      return data as SlaRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch departments for the selector
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, color")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        tenant_id: tenantId,
        department_id: values.department_id || null,
        first_response_minutes: values.first_response_minutes,
        resolution_minutes: values.resolution_minutes,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("sla_rules").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sla_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_rules", tenantId] });
      setEditOpen(false);
      setEditing(null);
      toast.success(editing ? "Regra SLA atualizada" : "Regra SLA criada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sla_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_rules", tenantId] });
      toast.success("Regra SLA excluida");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sla_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla_rules", tenantId] });
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ department_id: "", first_response_minutes: 5, resolution_minutes: 60, is_active: true });
    setEditOpen(true);
  };

  const openEdit = (rule: SlaRule) => {
    setEditing(rule);
    setForm({
      department_id: rule.department_id ?? "",
      first_response_minutes: rule.first_response_minutes,
      resolution_minutes: rule.resolution_minutes,
      is_active: rule.is_active,
    });
    setEditOpen(true);
  };

  const getDepartmentName = (id: string | null) => {
    if (!id) return "Todos os setores";
    return departments.find((d) => d.id === id)?.name ?? "Setor desconhecido";
  };

  const getDepartmentColor = (id: string | null) => {
    if (!id) return "#6366f1";
    return departments.find((d) => d.id === id)?.color ?? "#6366f1";
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" /> Configuracao de SLA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Defina tempos de resposta e resolucao por setor
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Regra
        </Button>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma regra SLA configurada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Regra" para comecar.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getDepartmentColor(rule.department_id) }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {getDepartmentName(rule.department_id)}
                      </span>
                      {!rule.is_active && (
                        <Badge variant="outline" className="text-[10px]">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        1a resposta: <strong className="text-foreground">{formatMinutes(rule.first_response_minutes)}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Resolucao: <strong className="text-foreground">{formatMinutes(rule.resolution_minutes)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, is_active: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <Building2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Excluir esta regra SLA?")) deleteMutation.mutate(rule.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SLA alert thresholds info */}
      <Card className="p-4 border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Indicador de SLA nas conversas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando o tempo de primeira resposta ou resolucao ultrapassar o limite configurado,
              um indicador vermelho sera exibido no card da conversa na Caixa de Entrada.
            </p>
          </div>
        </div>
      </Card>

      {/* Edit/Create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Regra SLA" : "Nova Regra SLA"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Department selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Setor</Label>
              <Select
                value={form.department_id || "__all__"}
                onValueChange={(v) => setForm((f) => ({ ...f, department_id: v === "__all__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os setores (padrao)</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* First response time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tempo de primeira resposta (minutos)</Label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={form.first_response_minutes}
                onChange={(e) => setForm((f) => ({ ...f, first_response_minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
              <p className="text-xs text-muted-foreground">
                Tempo maximo para a primeira resposta do atendente
              </p>
            </div>

            {/* Resolution time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tempo de resolucao (minutos)</Label>
              <Input
                type="number"
                min={1}
                max={14400}
                value={form.resolution_minutes}
                onChange={(e) => setForm((f) => ({ ...f, resolution_minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
              <p className="text-xs text-muted-foreground">
                Tempo maximo para resolver a conversa
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Regra ativa</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            {/* Save */}
            <Button
              className="w-full"
              onClick={() => saveMutation.mutate(editing ? { ...form, id: editing.id } : form)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editing ? "Atualizar" : "Criar Regra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
