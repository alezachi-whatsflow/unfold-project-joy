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
import { Plus, Zap, MessageSquare, UserPlus, Tag, ArrowRight, Webhook, Trash2, Bot, Edit2, FlaskConical, Sparkles, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Trigger {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  action_config: {
    reply_text?: string;
    webhook_url?: string;
    tag_name?: string;
    typebot_mode?: "classic" | "zero" | "labs";
    typebot_token?: string;
  };
  is_active: boolean;
  priority: number;
  typebot_id: string | null;
  typebot_url: string | null;
}

interface TypebotFlow {
  id: string;
  name: string;
  publicId: string | null;
}

const TYPEBOT_MODE_LABELS: Record<string, { label: string; description: string }> = {
  classic: { label: "Flow Classic", description: "Selecione um fluxo do seu painel Typebot" },
  zero: { label: "Flow Zero", description: "IA cria fluxos automaticamente (em breve)" },
  labs: { label: "Flow Labs", description: "Ambiente experimental com configuracao manual" },
};

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
  action_type: "reply", action_config: { reply_text: "" } as Record<string, string | undefined>,
  typebot_id: "", typebot_url: "", typebot_mode: "classic" as "classic" | "zero" | "labs",
};

export default function AutomationManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const [typebotViewerUrl, setTypebotViewerUrl] = useState("");

  const { data: typebotFlows = [], isLoading: loadingFlows } = useQuery({
    queryKey: ["typebot-flows", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("typebot-list-bots", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      if (!data || data.status !== "success") return [];
      if (data.viewer_url) setTypebotViewerUrl(data.viewer_url);
      return (data.typebots || []) as TypebotFlow[];
    },
    enabled: !!tenantId && form.action_type === "typebot" && form.typebot_mode === "classic" && createOpen,
  });

  const authorizeTypebotMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("typebot-authorize", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      if (!data || data.status !== "success" || !data.redirect_url) {
        throw new Error(data?.message || "Não foi possível autorizar o acesso ao Typebot");
      }
      return data as { redirect_url: string; message?: string };
    },
    onSuccess: (data) => {
      window.open(data.redirect_url, "_blank", "noopener,noreferrer");
      toast.success(data.message || "Typebot aberto em uma nova aba");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Tente novamente. Se persistir, contate o suporte.");
    },
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isTypebot = form.action_type === "typebot";
      const actionConfig = isTypebot
        ? { ...form.action_config, typebot_mode: form.typebot_mode }
        : form.action_config;

      const payload = {
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_value: form.trigger_value,
        action_type: form.action_type,
        action_config: actionConfig,
        typebot_id: isTypebot ? form.typebot_id || null : null,
        typebot_url: isTypebot ? (form.typebot_url || typebotViewerUrl || null) : null,
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
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao salvar automação"),
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
      typebot_mode: (t.action_config?.typebot_mode as "classic" | "zero" | "labs") || "classic",
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => authorizeTypebotMutation.mutate()}
            disabled={authorizeTypebotMutation.isPending}
            size="sm"
            className="gap-1"
          >
            <Bot size={14} />
            {authorizeTypebotMutation.isPending ? "Abrindo..." : "Fluxo Typebot"}
          </Button>
          <Button onClick={openNew} size="sm" className="gap-1"><Plus size={14} /> Nova Automacao</Button>
        </div>
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
                    {t.action_type === "typebot" && (
                      <>
                        {t.action_config?.typebot_mode && (
                          <Badge variant="secondary" className="text-[9px] gap-0.5">
                            {t.action_config.typebot_mode === "classic" && <Bot size={8} />}
                            {t.action_config.typebot_mode === "labs" && <FlaskConical size={8} />}
                            {t.action_config.typebot_mode === "zero" && <Sparkles size={8} />}
                            {TYPEBOT_MODE_LABELS[t.action_config.typebot_mode]?.label || t.action_config.typebot_mode}
                          </Badge>
                        )}
                        {t.typebot_id && (
                          <Badge variant="secondary" className="text-[9px] gap-0.5"><Bot size={8} /> {t.typebot_id}</Badge>
                        )}
                      </>
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
              <div className="space-y-3 p-3 border border-blue-500/20 bg-blue-500/5 rounded">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
                  <Bot size={16} />
                  Configuracao do Typebot
                </div>

                {/* Mode selector */}
                <div className="grid grid-cols-3 gap-2">
                  {(["classic", "zero", "labs"] as const).map((mode) => {
                    const selected = form.typebot_mode === mode;
                    const isZero = mode === "zero";
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={isZero}
                        onClick={() => setForm({ ...form, typebot_mode: mode, typebot_id: "", typebot_url: "", action_config: { ...form.action_config, typebot_token: undefined } })}
                        className={`relative p-2 rounded border text-center transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-500/10 text-blue-500"
                            : isZero
                            ? "border-muted/40 bg-muted/5 text-muted-foreground/40 cursor-not-allowed"
                            : "border-muted bg-background text-muted-foreground hover:border-blue-500/40"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {mode === "classic" && <Bot size={16} />}
                          {mode === "zero" && <Sparkles size={16} />}
                          {mode === "labs" && <FlaskConical size={16} />}
                          <span className="text-[10px] font-semibold leading-tight">{TYPEBOT_MODE_LABELS[mode].label}</span>
                        </div>
                        {isZero && (
                          <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-[8px] text-white px-1 rounded-full font-bold">BREVE</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">{TYPEBOT_MODE_LABELS[form.typebot_mode].description}</p>

                {/* Flow Classic - select from account */}
                {form.typebot_mode === "classic" && (
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Selecione o fluxo</label>
                    {loadingFlows ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 size={14} className="animate-spin" /> Carregando fluxos...
                      </div>
                    ) : typebotFlows.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">
                        Nenhum fluxo encontrado. Crie um fluxo no painel Typebot primeiro.
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {form.typebot_id ? (
                              <span className="flex items-center gap-1.5 truncate">
                                <Bot size={12} className="text-blue-500 shrink-0" />
                                {typebotFlows.find((tb) => (tb.publicId || tb.id) === form.typebot_id)?.name || form.typebot_id}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Selecione um fluxo...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar fluxo..." />
                            <CommandList>
                              <CommandEmpty>Nenhum fluxo encontrado.</CommandEmpty>
                              <CommandGroup>
                                {typebotFlows.map((tb) => {
                                  const value = tb.publicId || tb.id;
                                  return (
                                    <CommandItem
                                      key={tb.id}
                                      value={tb.name}
                                      onSelect={() => setForm({ ...form, typebot_id: value })}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", form.typebot_id === value ? "opacity-100" : "opacity-0")} />
                                      <Bot size={12} className="mr-1.5 text-blue-500 shrink-0" />
                                      {tb.name}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}

                {/* Flow Labs - manual config */}
                {form.typebot_mode === "labs" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">URL do Typebot</label>
                      <Input
                        placeholder="https://typebot.seudominio.com"
                        value={form.typebot_url}
                        onChange={(e) => setForm({ ...form, typebot_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Typebot ID (slug do fluxo)</label>
                      <Input
                        placeholder="Ex: atendimento-vendas"
                        value={form.typebot_id}
                        onChange={(e) => setForm({ ...form, typebot_id: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Token de acesso</label>
                      <Input
                        type="password"
                        placeholder="Token do Typebot"
                        value={form.action_config.typebot_token || ""}
                        onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, typebot_token: e.target.value } })}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Token de autenticacao para acessar a API do Typebot do cliente</p>
                    </div>
                  </div>
                )}
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
