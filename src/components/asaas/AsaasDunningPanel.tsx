import { useState } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { upsertDunningRule, simulateDunning } from "@/lib/asaasQueries";
import type { DunningStep, DunningRule } from "@/types/asaas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Shield, Play } from "lucide-react";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  notification: "Notificação",
  sms: "SMS",
  email: "E-mail",
  protest: "Protesto",
};

export function AsaasDunningPanel() {
  const { dunningRules, refetch, environment } = useAsaas();
  const [editingRule, setEditingRule] = useState<Partial<DunningRule> | null>(null);
  const [simulatePaymentId, setSimulatePaymentId] = useState("");

  const handleNewRule = () => {
    setEditingRule({
      name: "",
      description: "",
      status: "draft",
      rules: [{ days_after_due: 1, action: "email", message: "Lembrete de pagamento" }],
      version: 1,
    });
  };

  const handleAddStep = () => {
    if (!editingRule) return;
    const steps = [...(editingRule.rules || [])];
    const lastDay = steps.length > 0 ? steps[steps.length - 1].days_after_due + 3 : 1;
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
      await upsertDunningRule(editingRule);
      toast.success("Régua de cobrança salva");
      setEditingRule(null);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar régua");
    }
  };

  const handleSimulate = async () => {
    if (!simulatePaymentId.trim()) {
      toast.error("Informe o ID do pagamento");
      return;
    }
    try {
      const result = await simulateDunning(simulatePaymentId.trim(), environment);
      toast.success("Simulação executada com sucesso");
      console.log("Simulação:", result);
    } catch (err) {
      console.error(err);
      toast.error("Erro na simulação de dunning");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Régua de Cobrança</h2>
          <p className="text-xs text-muted-foreground">
            Configure ações automáticas para cobranças vencidas
          </p>
        </div>
        <Button size="sm" onClick={handleNewRule} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Nova Régua
        </Button>
      </div>

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
              {editingRule.id ? "Editar Régua" : "Nova Régua de Cobrança"}
            </CardTitle>
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Etapas da Régua</label>
                <Button size="sm" variant="ghost" onClick={handleAddStep} className="text-xs h-7 gap-1">
                  <Plus className="h-3 w-3" /> Etapa
                </Button>
              </div>
              <div className="space-y-2">
                {(editingRule.rules || []).map((step, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                    <div className="w-16">
                      <label className="text-[10px] text-muted-foreground">Dias</label>
                      <Input
                        type="number"
                        value={step.days_after_due}
                        onChange={(e) => handleUpdateStep(i, "days_after_due", Number(e.target.value))}
                        className="h-7 text-xs"
                        min={1}
                      />
                    </div>
                    <div className="w-28">
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
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground">Mensagem</label>
                      <Input
                        value={step.message}
                        onChange={(e) => handleUpdateStep(i, "message", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Mensagem..."
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 mt-3 text-destructive"
                      onClick={() => handleRemoveStep(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} className="text-xs">Salvar Régua</Button>
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
          {dunningRules.map((rule) => (
            <Card key={rule.id} className="border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{rule.name}</span>
                    <Badge variant={rule.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {rule.status === "active" ? "Ativa" : rule.status === "paused" ? "Pausada" : "Rascunho"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setEditingRule(rule)}
                  >
                    Editar
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {rule.rules.map((step, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      D+{step.days_after_due}: {ACTION_LABELS[step.action] || step.action}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
