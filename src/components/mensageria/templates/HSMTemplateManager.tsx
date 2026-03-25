import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { toast } from "sonner";

interface HSMTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejection_reason: string | null;
  body_text: string;
  header_type: string | null;
  footer_text: string | null;
  buttons: any[];
  variables: string[];
  usage_count: number;
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pendente", color: "#f59e0b", icon: Clock },
  APPROVED: { label: "Aprovado", color: "#10b981", icon: CheckCircle2 },
  REJECTED: { label: "Rejeitado", color: "#ef4444", icon: XCircle },
};

const CATEGORIES = [
  { value: "UTILITY", label: "Utilidade (transacional)" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Autenticação" },
];

export default function HSMTemplateManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "UTILITY", body_text: "", footer_text: "", language: "pt_BR" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["hsm-templates", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from("hsm_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as HSMTemplate[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const vars = (form.body_text.match(/\{\{\d+\}\}/g) || []);
      const { error } = await supabase.from("hsm_templates").insert({
        ...form, tenant_id: tenantId, variables: vars, status: "PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsm-templates", tenantId] });
      setCreateOpen(false);
      setForm({ name: "", category: "UTILITY", body_text: "", footer_text: "", language: "pt_BR" });
      toast.success("Template criado — aguardando aprovação da Meta");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = templates.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Templates HSM (Meta)</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Templates oficiais para API Cloud do WhatsApp Business. {templates.filter((t) => t.status === "APPROVED").length} aprovados.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1"><Plus size={14} /> Novo Template</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <Input placeholder="Buscar templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="APPROVED">Aprovados</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="REJECTED">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Nenhum template encontrado</p>
        ) : (
          filtered.map((t) => {
            const badge = STATUS_BADGES[t.status] || STATUS_BADGES.PENDING;
            const Icon = badge.icon;
            return (
              <Card key={t.id} className="p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} style={{ color: "var(--acc)" }} />
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                  <Badge className="text-[10px] gap-1" style={{ background: `${badge.color}20`, color: badge.color, border: `1px solid ${badge.color}40` }}>
                    <Icon size={10} /> {badge.label}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                </div>
                <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{t.body_text}</p>
                {t.rejection_reason && (
                  <p className="text-[10px] text-red-400">Motivo: {t.rejection_reason}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Usado {t.usage_count}×</span>
                  {t.variables.length > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Variáveis: {t.variables.join(", ")}</span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Template HSM</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome do template" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Corpo do template... Use {{1}}, {{2}} para variáveis" value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={4} />
            <Input placeholder="Rodapé (opcional)" value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
            <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.body_text || createMutation.isPending} className="w-full gap-1">
              <Send size={14} /> {createMutation.isPending ? "Criando..." : "Criar e Enviar para Aprovação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
