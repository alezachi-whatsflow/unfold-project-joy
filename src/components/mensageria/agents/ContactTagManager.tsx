import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag, Search, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TenantTag {
  id: string;
  name: string;
  color: string;
  category: string;
  created_at: string;
}

const TAG_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#d946ef", "#0ea5e9", "#65a30d",
];

const CATEGORIES = [
  { value: "general", label: "Geral" },
  { value: "lead_status", label: "Status do Lead" },
  { value: "priority", label: "Prioridade" },
  { value: "source", label: "Origem" },
];

export default function ContactTagManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TenantTag | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1", category: "general" });
  const [deleteConfirm, setDeleteConfirm] = useState<TenantTag | null>(null);

  // Fetch tags from tenant_tags table
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tenant-tags", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_tags")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return (data || []) as TenantTag[];
    },
    enabled: !!tenantId,
  });

  // Also fetch usage counts from various tables
  const { data: usageCounts = new Map() } = useQuery({
    queryKey: ["tag-usage-counts", tenantId],
    queryFn: async () => {
      if (!tenantId) return new Map();
      const [{ data: leads }, { data: contacts }] = await Promise.all([
        supabase.from("whatsapp_leads").select("lead_tags"),
        supabase.from("crm_contacts").select("tags").eq("tenant_id", tenantId).not("tags", "is", null),
      ]);
      const counts = new Map<string, number>();
      for (const row of leads || []) {
        for (const t of (row.lead_tags as string[]) || []) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
      for (const row of contacts || []) {
        for (const t of (row.tags as string[]) || []) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
      return counts;
    },
    enabled: !!tenantId,
  });

  const filtered = tags.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  // Create tag
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; category: string }) => {
      const { error } = await supabase.from("tenant_tags").insert({
        tenant_id: tenantId,
        name: data.name.trim(),
        color: data.color,
        category: data.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-tags"] });
      toast.success("Tag criada com sucesso");
      setEditOpen(false);
      setForm({ name: "", color: "#6366f1", category: "general" });
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) toast.error("Essa tag ja existe");
      else toast.error("Erro ao criar tag: " + err.message);
    },
  });

  // Update tag
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; color: string; category: string }) => {
      const { error } = await supabase.from("tenant_tags").update({
        name: data.name.trim(),
        color: data.color,
        category: data.category,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-tags"] });
      toast.success("Tag atualizada");
      setEditOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error("Erro ao atualizar: " + err.message),
  });

  // Delete tag
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-tags"] });
      toast.success("Tag excluida");
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)], category: "general" });
    setEditOpen(true);
  };

  const openEdit = (tag: TenantTag) => {
    setEditing(tag);
    setForm({ name: tag.name, color: tag.color, category: tag.category });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nome da tag obrigatorio"); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tags de Contato</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie as tags usadas em contatos, leads, negocios e conversas. {tags.length} tags cadastradas.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus size={14} />
          Nova Tag
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* Tag cloud */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-2 py-1">
          {filtered.slice(0, 30).map((t) => (
            <Badge
              key={t.id}
              className="text-xs px-3 py-1 cursor-pointer hover:opacity-80"
              style={{ background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}40` }}
              onClick={() => openEdit(t)}
            >
              <Tag size={10} className="mr-1" />
              {t.name}
              {usageCounts.get(t.name) ? <span className="ml-1.5 opacity-60">({usageCounts.get(t.name)})</span> : null}
            </Badge>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Tag</th>
              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Categoria</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Usos</th>
              <th className="text-right py-2 text-xs font-medium text-muted-foreground w-20">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                {search ? "Nenhuma tag encontrada" : "Nenhuma tag cadastrada. Clique em '+ Nova Tag' para comecar."}
              </td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="text-sm text-foreground">{t.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                    </span>
                  </td>
                  <td className="text-right py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">{usageCounts.get(t.name) || 0}</span>
                  </td>
                  <td className="text-right py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(t)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tag" : "Nova Tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome da Tag *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: VIP, Urgente, Novo Lead..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cor</label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: c,
                      outline: form.color === c ? `2px solid ${c}` : "2px solid transparent",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="pt-2">
              <label className="text-xs text-muted-foreground mb-1 block">Preview</label>
              <Badge
                className="text-xs px-3 py-1"
                style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}
              >
                <Tag size={10} className="mr-1" />
                {form.name || "Nome da tag"}
              </Badge>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Excluir tag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a tag <strong className="text-foreground">"{deleteConfirm?.name}"</strong>?
              {(usageCounts.get(deleteConfirm?.name || "") || 0) > 0 && (
                <span className="block mt-1 text-destructive">
                  Esta tag esta sendo usada em {usageCounts.get(deleteConfirm?.name || "")} registro(s).
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
