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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Zap, MessageSquare, UserPlus, Tag, ArrowRight, Webhook, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Trigger {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  action_config: any;
  is_active: boolean;
  priority: number;
}

const ACTION_ICONS: Record<string, typeof Zap> = {
  reply: MessageSquare,
  assign: UserPlus,
  tag: Tag,
  transfer: ArrowRight,
  webhook: Webhook,
};

const ACTION_LABELS: Record<string, string> = {
  reply: "Responder automaticamente",
  assign: "Atribuir a agente",
  tag: "Adicionar tag",
  transfer: "Transferir para setor",
  webhook: "Chamar webhook",
};

export default function AutomationManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", trigger_type: "keyword", trigger_value: "",
    action_type: "reply", action_config: { reply_text: "" },
  });

  const { data: triggers = [] } = useQuery({
    queryKey: ["automation-triggers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("automation_triggers").select("*").eq("tenant_id", tenantId).order("priority");
      return (data || []) as Trigger[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("automation_triggers").insert({ ...form, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-triggers", tenantId] });
      setCreateOpen(false);
      toast.success("Automação criada");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("automation_triggers").update({ is_active: active }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-triggers", tenantId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("automation_triggers").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-triggers", tenantId] });
      toast.success("Automação removida");
    },
  });

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Automações</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Gatilhos por palavra-chave, eventos e agendamentos. {triggers.filter((t) => t.is_active).length} ativas.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1"><Plus size={14} /> Nova Automação</Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {triggers.length === 0 ? (
          <div className="text-center py-12">
            <Zap size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhuma automação configurada</p>
          </div>
        ) : (
          triggers.map((t) => {
            const ActionIcon = ACTION_ICONS[t.action_type] || Zap;
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", opacity: t.is_active ? 1 : 0.5 }}>
                <Zap size={16} style={{ color: t.is_active ? "var(--acc)" : "var(--text-muted)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    <Badge variant="outline" className="text-[9px]">Quando: "{t.trigger_value}"</Badge>
                    <ArrowRight size={10} />
                    <Badge variant="outline" className="text-[9px] gap-0.5"><ActionIcon size={8} /> {ACTION_LABELS[t.action_type]}</Badge>
                  </div>
                </div>
                <Switch checked={t.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, active: v })} />
                <button onClick={() => deleteMutation.mutate(t.id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 size={14} className="text-red-400" /></button>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Automação</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome da automação" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Quando receber a palavra-chave:</label>
              <Input placeholder="Ex: preço, orçamento, cancelar" value={form.trigger_value} onChange={(e) => setForm({ ...form, trigger_value: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Ação:</label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.action_type === "reply" && (
              <Textarea placeholder="Texto da resposta automática..." value={form.action_config.reply_text || ""} onChange={(e) => setForm({ ...form, action_config: { reply_text: e.target.value } })} rows={3} />
            )}
            {form.action_type === "webhook" && (
              <Input placeholder="URL do webhook" value={form.action_config.webhook_url || ""} onChange={(e) => setForm({ ...form, action_config: { webhook_url: e.target.value } })} />
            )}
            <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.trigger_value || createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Criando..." : "Criar Automação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
