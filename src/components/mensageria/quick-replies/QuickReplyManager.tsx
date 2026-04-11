import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit2, Trash2, Lock, Globe, Building2, Zap, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type Visibility = "all" | "sector" | "exclusive";

interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  body: string;
  media_url: string | null;
  media_type: string | null;
  is_private: boolean;
  visibility: Visibility;
  category: string | null;
  sector_ids: string[];
  usage_count: number;
  created_at: string;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: "all", label: "Todos", icon: Globe },
  { value: "sector", label: "Setor específico", icon: Building2 },
  { value: "exclusive", label: "Exclusivo (só eu)", icon: Lock },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Sem categoria" },
  { value: "saudacao", label: "Saudação" },
  { value: "atendimento", label: "Atendimento" },
  { value: "vendas", label: "Vendas" },
  { value: "suporte", label: "Suporte" },
  { value: "cobranca", label: "Cobrança" },
  { value: "follow-up", label: "Follow-up" },
  { value: "encerramento", label: "Encerramento" },
  { value: "outro", label: "Outro" },
];

export default function QuickReplyManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [form, setForm] = useState({ title: "", shortcut: "", body: "", is_private: false, visibility: "all" as Visibility, category: "" as string, sector_ids: [] as string[] });
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["quick-replies", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (!tenantId) throw new Error("Tenant não identificado");
      const shortcut = values.shortcut.startsWith("/") ? values.shortcut : `/${values.shortcut}`;
      const payload = {
        title: values.title.trim(),
        shortcut,
        body: values.body,
        is_private: values.is_private,
        visibility: values.visibility || "all",
        category: values.category || null,
        sector_ids: values.sector_ids || [],
        tenant_id: tenantId,
      };
      if (values.id) {
        const { error } = await supabase.from("quick_replies").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quick_replies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", tenantId] });
      setEditOpen(false);
      setEditing(null);
      toast.success(editing ? "Modelo atualizado" : "Modelo criado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", tenantId] });
      toast.success("Modelo excluído");
    },
  });

  const filtered = replies.filter((r) => {
    if (filterCategory !== "all" && (r.category || "") !== filterCategory) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.shortcut.includes(search) && !r.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", shortcut: "", body: "", is_private: false, visibility: "all", category: "", sector_ids: [] });
    setEditOpen(true);
  };

  const openEdit = (r: QuickReply) => {
    setEditing(r);
    setForm({
      title: r.title, shortcut: r.shortcut, body: r.body, is_private: r.is_private,
      visibility: r.visibility || "all", category: r.category || "", sector_ids: r.sector_ids || [],
    });
    setEditOpen(true);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Respostas Rápidas</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Digite "/" no chat para acessar. {replies.length} respostas cadastradas.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1">
          <Plus size={14} /> Novo Modelo
        </Button>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <Input
            placeholder="Buscar por título, atalho ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 text-xs"><FolderOpen size={12} className="mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORY_OPTIONS.filter((c) => c.value).map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            {search ? "Nenhuma resposta encontrada" : "Nenhuma resposta cadastrada. Crie a primeira!"}
          </p>
        ) : (
          filtered.map((r) => (
            <Card key={r.id} className="p-3 flex items-start gap-3 group" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.title}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{r.shortcut}</Badge>
                  {(() => {
                    const vis = VISIBILITY_OPTIONS.find((v) => v.value === (r.visibility || "all")) || VISIBILITY_OPTIONS[0];
                    const VisIcon = vis.icon;
                    return <Badge variant="outline" className="text-[9px] gap-0.5"><VisIcon size={8} /> {vis.label}</Badge>;
                  })()}
                  {r.category && (
                    <Badge variant="secondary" className="text-[9px]">
                      {CATEGORY_OPTIONS.find((c) => c.value === r.category)?.label || r.category}
                    </Badge>
                  )}
                  {r.media_url && <Badge variant="secondary" className="text-[9px]">📎 Mídia</Badge>}
                </div>
                <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{r.body}</p>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Usado {r.usage_count}×</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-accent/10"><Edit2 size={14} style={{ color: "var(--text-secondary)" }} /></button>
                <button onClick={() => deleteMutation.mutate(r.id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 size={14} className="text-red-400" /></button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Resposta" : "Nova Modelo de Mensagem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Título (ex: Boas-vindas)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="relative">
              <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <Input placeholder="Atalho (ex: /ola)" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} className="pl-9 font-mono" />
            </div>
            <Textarea placeholder="Texto da resposta... Use {{nome}} para variáveis" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
            {/* Category */}
            <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="text-sm"><FolderOpen size={12} className="mr-1" /><SelectValue placeholder="Categoria (opcional)" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Visibilidade:</span>
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, visibility: opt.value })}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors"
                    style={{
                      background: isSelected ? "var(--acc, hsl(var(--primary)))" : "transparent",
                      color: isSelected ? "#fff" : "var(--text-muted)",
                      border: `1px solid ${isSelected ? "transparent" : "var(--border)"}`,
                    }}
                  >
                    <Icon size={10} /> {opt.label}
                  </button>
                );
              })}
            </div>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={!form.title.trim() || !form.shortcut.trim() || !form.body.trim() || saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
