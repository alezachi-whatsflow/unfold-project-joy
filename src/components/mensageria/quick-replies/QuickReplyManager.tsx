import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Edit2, Trash2, Lock, Globe, Building2, Zap,
  FolderOpen, MessageSquareText, Hash, Eye,
} from "lucide-react";
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

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; color: string }[] = [
  { value: "all", label: "Todos", icon: Globe, color: "#10B981" },
  { value: "sector", label: "Setor específico", icon: Building2, color: "#3B82F6" },
  { value: "exclusive", label: "Exclusivo (só eu)", icon: Lock, color: "#F59E0B" },
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
    <div className="flex flex-col h-full p-5 gap-5">
      {/* Header card */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <MessageSquareText size={20} style={{ color: "#10B981" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>Modelos de Msgs</h2>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Digite <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "hsl(var(--muted))" }}>/</code> no chat para acessar. {replies.length} modelos cadastrados.
            </p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus size={14} /> Novo Modelo
        </Button>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
          <Input
            placeholder="Buscar por título, atalho ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm rounded-lg"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 text-xs rounded-lg">
            <FolderOpen size={12} className="mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas...</SelectItem>
            {CATEGORY_OPTIONS.filter((c) => c.value).map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MessageSquareText size={32} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.3 }} />
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {search ? "Nenhuma resposta encontrada" : "Nenhum modelo cadastrado. Crie o primeiro!"}
            </p>
          </div>
        ) : (
          filtered.map((r) => {
            const vis = VISIBILITY_OPTIONS.find((v) => v.value === (r.visibility || "all")) || VISIBILITY_OPTIONS[0];
            const VisIcon = vis.icon;
            return (
              <div
                key={r.id}
                className="group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${vis.color}15` }}
                  >
                    <MessageSquareText size={16} style={{ color: vis.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                        {r.title}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                        style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                      >
                        {r.shortcut}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1"
                        style={{ background: `${vis.color}12`, color: vis.color }}
                      >
                        <VisIcon size={9} /> {vis.label}
                      </span>
                      {r.category && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                        >
                          {CATEGORY_OPTIONS.find((c) => c.value === r.category)?.label || r.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {r.body}
                    </p>
                    <span className="text-[10px] mt-1 inline-block" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
                      Usado {r.usage_count}×
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(r)}
                      className="p-2 rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
                      title="Editar"
                    >
                      <Edit2 size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                      title="Excluir"
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo de Mensagem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Título (ex: Boas-vindas)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg" />
            <div className="relative">
              <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
              <Input placeholder="Atalho (ex: /ola)" value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} className="pl-9 font-mono rounded-lg" />
            </div>
            <Textarea placeholder="Texto da resposta... Use {{nome}} para variáveis" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="rounded-lg" />
            {/* Category */}
            <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="text-sm rounded-lg"><FolderOpen size={12} className="mr-1" /><SelectValue placeholder="Categoria (opcional)" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Visibility */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Visibilidade</span>
              <div className="flex gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, visibility: opt.value })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] rounded-lg transition-all"
                      style={{
                        background: isSelected ? `${opt.color}18` : "transparent",
                        color: isSelected ? opt.color : "hsl(var(--muted-foreground))",
                        border: `1px solid ${isSelected ? `${opt.color}40` : "hsl(var(--border))"}`,
                      }}
                    >
                      <Icon size={12} /> {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editing?.id })}
              disabled={!form.title.trim() || !form.shortcut.trim() || !form.body.trim() || saveMutation.isPending}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700"
            >
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
