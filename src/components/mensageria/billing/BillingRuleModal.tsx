import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BillingRule, BillingStep } from "../BillingRulesTab";

interface Props {
  open: boolean;
  rule: BillingRule | null;
  onClose: () => void;
  onSaved: () => void;
}

const VARIABLES = ["{{nome}}", "{{valor}}", "{{vencimento}}", "{{link_boleto}}", "{{dias_atraso}}"];

const DEFAULT_STEP: BillingStep = { days_offset: -3, label: "", message_template: "" };

export default function BillingRuleModal({ open, rule, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<BillingStep[]>([{ ...DEFAULT_STEP }]);
  const [instances, setInstances] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("whatsapp_instances").select("id, label").then(({ data }) => {
        if (data) setInstances(data);
      });
    }
  }, [open]);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setInstanceId(rule.instance_id || "");
      setIsActive(rule.is_active);
      setSteps(rule.steps.length > 0 ? rule.steps : [{ ...DEFAULT_STEP }]);
    } else {
      setName("");
      setInstanceId("");
      setIsActive(true);
      setSteps([{ ...DEFAULT_STEP }]);
    }
  }, [rule, open]);

  const updateStep = (idx: number, patch: Partial<BillingStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    if (steps.length >= 4) return;
    setSteps((prev) => [...prev, { ...DEFAULT_STEP, days_offset: prev.length }]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const insertVariable = (idx: number, variable: string) => {
    updateStep(idx, { message_template: steps[idx].message_template + variable });
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Preencha o nome da régua."); return; }
    if (steps.length === 0) { toast.error("Adicione pelo menos uma etapa."); return; }

    setSaving(true);
    const payload = {
      name: name.trim(),
      instance_id: instanceId || null,
      is_active: isActive,
      steps: steps,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (rule) {
      ({ error } = await supabase.from("whatsapp_billing_rules").update(payload).eq("id", rule.id));
    } else {
      ({ error } = await supabase.from("whatsapp_billing_rules").insert(payload));
    }

    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(rule ? "Régua atualizada!" : "Régua criada!");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Régua" : "Nova Régua de Cobrança"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome da Régua</Label>
              <Input placeholder="Ex: Boleto Vencendo - Pioneira" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Conexão WhatsApp</Label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm">{isActive ? "Ativa" : "Inativa"}</Label>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Etapas de Disparo</Label>
              {steps.length < 4 && (
                <Button variant="outline" size="sm" onClick={addStep} className="gap-1">
                  <Plus className="h-3 w-3" /> Etapa
                </Button>
              )}
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Etapa {idx + 1}</span>
                  {steps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={step.days_offset}
                    onChange={(e) => updateStep(idx, { days_offset: parseInt(e.target.value) || 0 })}
                    className="w-20 text-center"
                  />
                  <span className="text-xs text-muted-foreground">
                    {step.days_offset < 0
                      ? `${Math.abs(step.days_offset)} dias antes do vencimento`
                      : step.days_offset === 0
                      ? "No dia do vencimento"
                      : `${step.days_offset} dias após vencimento`}
                  </span>
                </div>
                <Textarea
                  value={step.message_template}
                  onChange={(e) => updateStep(idx, { message_template: e.target.value })}
                  placeholder="Olá {{nome}}, sua fatura de R$ {{valor}} vence em {{vencimento}}..."
                  className="text-xs min-h-[60px]"
                />
                <div className="flex flex-wrap gap-1">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(idx, v)}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Salvando..." : "Salvar Régua"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
