import { useState, useEffect } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { upsertDunningRule, simulateDunning, fetchCheckoutSources, fetchDunningExecutions } from "@/lib/asaasQueries";
import type { DunningStep, DunningRule, CheckoutSource } from "@/types/asaas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Shield, Play, Copy, History, Zap,
  Mail, MessageSquare, Bell, AlertTriangle, GripVertical,
  FileText, ArrowRight, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  notification: { label: "Notificação", icon: Bell, color: "text-blue-500" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-green-500" },
  email: { label: "E-mail", icon: Mail, color: "text-amber-500" },
  protest: { label: "Protesto", icon: AlertTriangle, color: "text-destructive" },
};

const TEMPLATES = [
  {
    key: "standard",
    name: "Régua Padrão",
    description: "Aviso antes do vencimento + cobrança gradual após",
    rules: [
      { days_after_due: -5, action: "email" as const, message: "Lembrete: sua fatura vence em 5 dias. Antecipe o pagamento pelo link." },
      { days_after_due: -1, action: "notification" as const, message: "Sua fatura vence amanhã. Pague agora e evite atrasos." },
      { days_after_due: 1, action: "notification" as const, message: "Olá! Identificamos que seu pagamento venceu ontem. Caso já tenha efetuado, desconsidere." },
      { days_after_due: 3, action: "email" as const, message: "Gostaríamos de lembrar que há um pagamento em aberto. Acesse o link para regularizar." },
      { days_after_due: 7, action: "sms" as const, message: "Pagamento em atraso há 7 dias. Regularize para evitar bloqueio do serviço." },
      { days_after_due: 15, action: "protest" as const, message: "Último aviso antes de encaminhamento para protesto." },
    ],
  },
  {
    key: "gentle",
    name: "Régua Suave",
    description: "Lembretes gentis antes e depois do vencimento",
    rules: [
      { days_after_due: -3, action: "email" as const, message: "Sua fatura vence em 3 dias. Pague com antecedência!" },
      { days_after_due: 0, action: "email" as const, message: "Sua fatura vence hoje. Acesse o link para efetuar o pagamento." },
      { days_after_due: 2, action: "email" as const, message: "Notamos um pagamento pendente. Caso já tenha pago, desconsidere." },
      { days_after_due: 7, action: "email" as const, message: "Lembrete: seu pagamento está pendente há uma semana." },
      { days_after_due: 14, action: "email" as const, message: "Última notificação: pagamento em aberto há 14 dias." },
    ],
  },
  {
    key: "aggressive",
    name: "Régua Agressiva",
    description: "Ação rápida com SMS e protesto antecipado",
    rules: [
      { days_after_due: -1, action: "sms" as const, message: "Sua fatura vence amanhã. Evite juros e multa, pague agora." },
      { days_after_due: 1, action: "sms" as const, message: "Pagamento vencido. Regularize imediatamente." },
      { days_after_due: 2, action: "email" as const, message: "Pagamento em atraso. Acesse o link para pagar." },
      { days_after_due: 5, action: "sms" as const, message: "Última chance: pague em 48h para evitar protesto." },
      { days_after_due: 7, action: "protest" as const, message: "Encaminhamento para protesto por inadimplência." },
    ],
  },
];

export function AsaasDunningPanel() {
  const { dunningRules, refetch, environment } = useAsaas();
  const [editingRule, setEditingRule] = useState<Partial<DunningRule & { checkout_source_id?: string; template_key?: string }> | null>(null);
  const [simulatePaymentId, setSimulatePaymentId] = useState("");
  const [checkoutSources, setCheckoutSources] = useState<CheckoutSource[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loadingExecs, setLoadingExecs] = useState(false);

  useEffect(() => {
    fetchCheckoutSources().then(setCheckoutSources).catch(console.error);
  }, []);

  const handleNewRule = () => setShowTemplates(true);

  const handleSelectTemplate = (template: typeof TEMPLATES[0] | null) => {
    setEditingRule({
      name: template?.name || "",
      description: template?.description || "",
      status: "draft",
      rules: template?.rules || [{ days_after_due: -5, action: "email", message: "" }],
      version: 1,
      template_key: template?.key || undefined,
    });
    setShowTemplates(false);
  };

  const handleAddStep = () => {
    if (!editingRule) return;
    const steps = [...(editingRule.rules || [])];
    const lastDay = steps.length > 0 ? steps[steps.length - 1].days_after_due + 3 : -5;
    steps.push({ days_after_due: lastDay, action: "email", message: "" });
    setEditingRule({ ...editingRule, rules: steps });
  };

  const handleRemoveStep = (index: number) => {
    if (!editingRule) return;
    const steps = [...(editingRule.rules || [])];
    steps.splice(index, 1);
    setEditingRule({ ...editingRule, rules: steps });
  };

  const handleUpdateStep = (index: number, field: keyof DunningStep, value: string | number) => {
    if (!editingRule) return;
    const steps = [...(editingRule.rules || [])];
    steps[index] = { ...steps[index], [field]: value };
    setEditingRule({ ...editingRule, rules: steps });
  };

  const handleSave = async () => {
    if (!editingRule?.name) {
      toast.error("Nome da régua é obrigatório");
      return;
    }
    try {
      const newVersion = editingRule.id ? (editingRule.version || 1) + 1 : 1;
      await upsertDunningRule({
        ...editingRule,
        version: newVersion,
      });
      toast.success(`Régua salva (v${newVersion})`);
      setEditingRule(null);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar régua");
    }
  };

  const handleDuplicate = (rule: DunningRule) => {
    setEditingRule({
      ...rule,
      id: undefined,
      name: `${rule.name} (Cópia)`,
      status: "draft",
      version: 1,
    });
  };

  const handleViewHistory = async (ruleId: string) => {
    setShowHistory(ruleId);
    setLoadingExecs(true);
    try {
      const data = await fetchDunningExecutions(ruleId);
      setExecutions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExecs(false);
    }
  };

  const handleSimulate = async () => {
    if (!simulatePaymentId.trim()) {
      toast.error("Informe o ID do pagamento");
      return;
    }
    try {
      await simulateDunning(simulatePaymentId.trim(), environment);
      toast.success("Simulação executada com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro na simulação de dunning");
    }
  };

  const getSourceName = (id?: string) => {
    if (!id) return null;
    return checkoutSources.find(s => s.id === id)?.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Régua de Cobrança</h2>
          <p className="text-xs text-muted-foreground">
            Configure playbooks automáticos para cobranças vencidas
          </p>
        </div>
        <Button size="sm" onClick={handleNewRule} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Nova Régua
        </Button>
      </div>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolha um Template</DialogTitle>
            <DialogDescription>Selecione um modelo pronto ou comece do zero</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {TEMPLATES.map((t) => (
              <Card
                key={t.key}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectTemplate(t)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {t.rules.map((s, i) => {
                      const cfg = ACTION_CONFIG[s.action];
                      const Icon = cfg.icon;
                      return (
                        <Badge key={i} variant="outline" className={`text-[10px] gap-1 ${s.days_after_due < 0 ? "border-amber-500/50" : ""}`}>
                          <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                          {s.days_after_due < 0 ? `D${s.days_after_due}` : s.days_after_due === 0 ? "D0" : `D+${s.days_after_due}`}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => handleSelectTemplate(null)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Criar do Zero
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execution History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={() => setShowHistory(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico de Execuções
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 mt-2">
            {loadingExecs ? (
              <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
            ) : executions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma execução registrada para esta régua
              </p>
            ) : (
              executions.map((exec) => (
                <div key={exec.id} className="flex items-center gap-3 p-2 rounded-md border border-border bg-background">
                  {exec.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        Etapa {exec.step_index + 1}: {ACTION_CONFIG[exec.action]?.label || exec.action}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(exec.executed_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Simulation */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground" />
            Simulação de Dunning
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">ID do Pagamento (Asaas)</label>
            <Input
              placeholder="pay_xxx"
              value={simulatePaymentId}
              onChange={(e) => setSimulatePaymentId(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleSimulate} className="text-xs">
            Simular
          </Button>
        </CardContent>
      </Card>

      {/* Editing Form */}
      {editingRule && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {editingRule.id ? `Editar Régua (v${editingRule.version})` : "Nova Régua de Cobrança"}
            </CardTitle>
            {editingRule.id && (
              <CardDescription className="text-[10px]">
                Salvar criará a versão {(editingRule.version || 1) + 1}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input
                  value={editingRule.name || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Ex: Régua Padrão"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select
                  value={editingRule.status || "draft"}
                  onValueChange={(v) => setEditingRule({ ...editingRule, status: v as DunningRule["status"] })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Checkout Source (Playbook)</label>
                <Select
                  value={(editingRule as any).checkout_source_id || "all"}
                  onValueChange={(v) => setEditingRule({ ...editingRule, checkout_source_id: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {checkoutSources.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Input
                  value={editingRule.description || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Descrição da régua..."
                />
              </div>
            </div>

            {/* Visual Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-muted-foreground">Timeline da Régua</label>
                <Button size="sm" variant="ghost" onClick={handleAddStep} className="text-xs h-7 gap-1">
                  <Plus className="h-3 w-3" /> Etapa
                </Button>
              </div>

              {/* Visual timeline */}
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                {(editingRule.rules || []).map((step, i) => {
                  const cfg = ACTION_CONFIG[step.action];
                  const Icon = cfg?.icon || Bell;
                  return (
                    <div key={i} className="relative">
                      <div className={`absolute -left-6 top-3 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center ${
                        step.action === "protest" ? "bg-destructive" : "bg-primary"
                      }`}>
                        <Icon className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                      <div className="rounded-md border border-border bg-background p-3 ml-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            D+{step.days_after_due}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] ${cfg?.color || ""}`}>
                            {cfg?.label || step.action}
                          </Badge>
                          <div className="flex-1" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleRemoveStep(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Dias após venc.</label>
                            <Input
                              type="number"
                              value={step.days_after_due}
                              onChange={(e) => handleUpdateStep(i, "days_after_due", Number(e.target.value))}
                              className="h-7 text-xs"
                              min={1}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Ação</label>
                            <Select
                              value={step.action}
                              onValueChange={(v) => handleUpdateStep(i, "action", v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="notification">Notificação</SelectItem>
                                <SelectItem value="email">E-mail</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="protest">Protesto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-1">
                            <label className="text-[10px] text-muted-foreground">Mensagem</label>
                            <Input
                              value={step.message}
                              onChange={(e) => handleUpdateStep(i, "message", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Mensagem..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} className="text-xs gap-1.5">
                <Zap className="h-3 w-3" />
                Salvar Régua
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingRule(null)} className="text-xs">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Rules */}
      {dunningRules.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Réguas Configuradas</h3>
          {dunningRules.map((rule) => {
            const sourceName = getSourceName((rule as any).checkout_source_id);
            return (
              <Card key={rule.id} className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{rule.name}</span>
                      <Badge variant={rule.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {rule.status === "active" ? "Ativa" : rule.status === "paused" ? "Pausada" : "Rascunho"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v{rule.version}
                      </Badge>
                      {sourceName && (
                        <Badge variant="outline" className="text-[10px]">
                          📍 {sourceName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleViewHistory(rule.id)}>
                        <History className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleDuplicate(rule)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingRule(rule)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                  {rule.description && (
                    <p className="text-[11px] text-muted-foreground mb-2">{rule.description}</p>
                  )}
                  {/* Mini timeline */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {rule.rules.map((step, i) => {
                      const cfg = ACTION_CONFIG[step.action];
                      const Icon = cfg?.icon || Bell;
                      return (
                        <div key={i} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Icon className={`h-2.5 w-2.5 ${cfg?.color || ""}`} />
                            D+{step.days_after_due}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
