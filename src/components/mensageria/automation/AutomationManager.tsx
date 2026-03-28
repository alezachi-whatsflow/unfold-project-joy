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
import { Plus, Zap, MessageSquare, UserPlus, Tag, ArrowRight, Webhook, Trash2, Bot, Edit2 } from "lucide-react";
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
  typebot_id: string | null;
  typebot_url: string | null;
}

const ACTION_ICONS: Record<string, typeof Zap> = {
  reply: MessageSquare,
  assign: UserPlus,
  tag: Tag,
  transfer: ArrowRight,
  webhook: Webhook,
  typebot: Bot,
};

const ACTION_LABELS: Record<string, string> = {
  reply: "Responder automaticamente",
  assign: "Atribuir a agente",
  tag: "Adicionar tag",
  transfer: "Transferir para setor",
  webhook: "Chamar webhook / n8n",
  typebot: "Iniciar fluxo Typebot",
};

const defaultForm = {
  name: "", trigger_type: "keyword", trigger_value: "",
  action_type: "reply", action_config: { reply_text: "" },
  typebot_id: "", typebot_url: "",
};

export default function AutomationManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const { data: triggers = [] } = useQuery({
    queryKey: ["automation-triggers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("automation_triggers").select("*").eq("tenant_id", tenantId).order("priority");
      return (data || []) as Trigger[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_value: form.trigger_value,
        action_type: form.action_type,
        action_config: form.action_config,
        typebot_id: form.action_type === "typebot" ? form.typebot_id || null : null,
        typebot_url: form.action_type === "typebot" ? form.typebot_url || null : null,
        tenant_id: tenantId,
      };
      if (editing) {
        const { error } = await supabase.from("automation_triggers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automation_triggers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-triggers", tenantId] });
      setCreateOpen(false);
      setEditing(null);
      setForm({ ...defaultForm });
      toast.success(editing ? "Automacao atualizada" : "Automacao criada");
    },
    onError: (err: any) => toast.error(err.message),
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
      toast.success("Automacao removida");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setCreateOpen(true);
  };

  const openEdit = (t: Trigger) => {
    setEditing(t);
    setForm({
      name: t.name,
      trigger_type: t.trigger_type,
      trigger_value: t.trigger_value,
      action_type: t.action_type,
      action_config: t.action_config || {},
      typebot_id: t.typebot_id || "",
      typebot_url: t.typebot_url || "",
    });
    setCreateOpen(true);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Automacoes</h2>
          <p className="text-xs text-muted-foreground">
            Gatilhos por palavra-chave com acoes automaticas e integracao Typebot. {triggers.filter((t) => t.is_active).length} ativas.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus size={14} /> Nova Automacao</Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {triggers.length === 0 ? (
          <div className="text-center py-12">
            <Zap size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Nenhuma automacao configurada</p>
            <p className="text-xs text-muted-foreground mt-1">Crie gatilhos para responder automaticamente, atribuir agentes ou iniciar fluxos Typebot.</p>
          </div>
        ) : (
          triggers.map((t) => {
            const ActionIcon = ACTION_ICONS[t.action_type] || Zap;
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3" style={{ opacity: t.is_active ? 1 : 0.5 }}>
                <div className="p-1.5 rounded bg-primary/10">
                  {t.action_type === "typebot" ? <Bot size={16} className="text-blue-500" /> : <Zap size={16} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-[9px]">
                      {t.trigger_value === "*" ? "Qualquer mensagem" : `"${t.trigger_value}"`}
                    </Badge>
                    <ArrowRight size={10} />
                    <Badge variant="outline" className="text-[9px] gap-0.5"><ActionIcon size={8} /> {ACTION_LABELS[t.action_type]}</Badge>
                    {t.action_type === "typebot" && t.typebot_id && (
                      <Badge variant="secondary" className="text-[9px] gap-0.5"><Bot size={8} /> {t.typebot_id}</Badge>
                    )}
                  </div>
                </div>
                <Switch checked={t.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, active: v })} />
                <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-muted"><Edit2 size={14} className="text-muted-foreground" /></button>
                <button onClick={() => deleteMutation.mutate(t.id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 size={14} className="text-red-400" /></button>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Automacao" : "Nova Automacao"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome da automacao" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Tipo de gatilho</label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="event">Evento (nova conversa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                {form.trigger_type === "keyword" ? "Palavra-chave (use * para qualquer mensagem):" : "Evento:"}
              </label>
              {form.trigger_type === "keyword" ? (
                <Input placeholder="Ex: preco, orcamento, * (qualquer)" value={form.trigger_value} onChange={(e) => setForm({ ...form, trigger_value: e.target.value })} />
              ) : (
                <Select value={form.trigger_value} onValueChange={(v) => setForm({ ...form, trigger_value: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_conversation">Nova conversa</SelectItem>
                    <SelectItem value="first_message">Primeira mensagem</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Acao:</label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-1.5">
                        {k === "typebot" && <Bot size={12} className="text-blue-500" />}
                        {v}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action-specific fields */}
            {form.action_type === "reply" && (
              <Textarea placeholder="Texto da resposta automatica..." value={form.action_config.reply_text || ""} onChange={(e) => setForm({ ...form, action_config: { reply_text: e.target.value } })} rows={3} />
            )}

            {form.action_type === "webhook" && (
              <Input placeholder="URL do webhook (n8n, Make, etc)" value={form.action_config.webhook_url || ""} onChange={(e) => setForm({ ...form, action_config: { webhook_url: e.target.value } })} />
            )}

            {form.action_type === "tag" && (
              <Input placeholder="Nome da tag a adicionar" value={form.action_config.tag_name || ""} onChange={(e) => setForm({ ...form, action_config: { tag_name: e.target.value } })} />
            )}

            {form.action_type === "typebot" && (
              <div className="space-y-3 p-3 border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
                  <Bot size={16} />
                  Configuracao do Typebot
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">URL do Typebot</label>
                  <Input
                    placeholder="https://typebot.seudominio.com"
                    value={form.typebot_url}
                    onChange={(e) => setForm({ ...form, typebot_url: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">URL base do seu Typebot (self-hosted ou cloud)</p>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Typebot ID (slug do fluxo)</label>
                  <Input
                    placeholder="Ex: atendimento-vendas"
                    value={form.typebot_id}
                    onChange={(e) => setForm({ ...form, typebot_id: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">O ID ou slug do fluxo no Typebot (encontre na URL do editor)</p>
                </div>
              </div>
            )}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.trigger_value || saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar" : "Criar Automacao"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
