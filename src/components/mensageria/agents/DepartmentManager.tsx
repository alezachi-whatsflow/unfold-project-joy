import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Users, RotateCcw, UserMinus, Hand } from "lucide-react";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  distribution_mode: string;
  is_default: boolean;
  created_at: string;
}

const DIST_LABELS: Record<string, { label: string; icon: typeof RotateCcw; desc: string }> = {
  round_robin: { label: "Round Robin", icon: RotateCcw, desc: "Distribui igualmente entre agentes" },
  least_busy: { label: "Menor Carga", icon: UserMinus, desc: "Prioriza o agente com menos conversas" },
  manual: { label: "Manual", icon: Hand, desc: "Gestor atribui manualmente" },
};

export default function DepartmentManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1", distribution_mode: "round_robin", is_default: false });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from("departments").select("*").eq("tenant_id", tenantId).order("created_at");
      if (error) throw error;
      return data as Department[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase.from("departments").update(values).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert({ ...values, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantId] });
      setEditOpen(false);
      setEditing(null);
      toast.success(editing ? "Setor atualizado" : "Setor criado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantId] });
      toast.success("Setor excluído");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", color: "#6366f1", distribution_mode: "round_robin", is_default: false });
    setEditOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || "", color: d.color, distribution_mode: d.distribution_mode, is_default: d.is_default });
    setEditOpen(true);
  };

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Setores / Departamentos</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Organize sua equipe por setores com distribuição automática. {departments.length} setores.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus size={14} /> Novo Setor</Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum setor criado</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Crie setores para organizar sua equipe</p>
          </div>
        ) : (
          departments.map((d) => {
            const dist = DIST_LABELS[d.distribution_mode] || DIST_LABELS.manual;
            const DistIcon = dist.icon;
            return (
              <Card key={d.id} className="p-4 group" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: d.color }} />
                  <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>{d.name}</span>
                  {d.is_default && <Badge className="text-[9px]" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>Padrão</Badge>}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-accent/10"><Edit2 size={14} style={{ color: "var(--text-secondary)" }} /></button>
                    <button onClick={() => deleteMutation.mutate(d.id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                </div>
                {d.description && <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{d.description}</p>}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1"><DistIcon size={10} /> {dist.label}</Badge>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{dist.desc}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Setor" : "Novo Setor"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome do setor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Cor</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.color === c ? "white" : "transparent", transform: form.color === c ? "scale(1.15)" : "scale(1)" }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Modo de distribuição</label>
              <Select value={form.distribution_mode} onValueChange={(v) => setForm({ ...form, distribution_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIST_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} — {v.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Setor padrão (novas conversas caem aqui)</span>
            </div>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={!form.name || saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar" : "Criar Setor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
