import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillingRuleModal from "./billing/BillingRuleModal";

export interface BillingStep {
  days_offset: number; // negative = before, 0 = on day, positive = after
  label: string;
  message_template: string;
}

export interface BillingRule {
  id: string;
  name: string;
  instance_id: string | null;
  is_active: boolean;
  steps: BillingStep[];
  created_at: string;
  instance_label?: string;
}

export default function BillingRulesTab() {
  const [rules, setRules] = useState<BillingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_billing_rules")
      .select("*, whatsapp_instances(label)")
      .order("created_at", { ascending: false });

    if (data) {
      setRules(
        data.map((r: any) => ({
          id: r.id,
          name: r.name,
          instance_id: r.instance_id,
          is_active: r.is_active,
          steps: r.steps || [],
          created_at: r.created_at,
          instance_label: r.whatsapp_instances?.label || "—",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("whatsapp_billing_rules").update({ is_active: !current }).eq("id", id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: !current } : r)));
  };

  const deleteRule = async (id: string) => {
    await supabase.from("whatsapp_billing_rules").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Régua excluída");
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingRule(null);
    fetchRules();
  };

  const stepLabel = (offset: number) => {
    if (offset < 0) return `${Math.abs(offset)}d antes`;
    if (offset === 0) return "No dia";
    return `${offset}d após`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Réguas de Cobrança</h2>
        <Button onClick={() => { setEditingRule(null); setShowModal(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" /> Nova Régua
        </Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="border-border/60 bg-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="font-semibold text-sm">{rule.name}</span>
                  <p className="text-xs text-muted-foreground">Conexão: {rule.instance_label}</p>
                </div>
                <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id, rule.is_active)} />
              </div>

              <div className="flex flex-wrap gap-1">
                {rule.steps.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    Etapa {i + 1}: {stepLabel(s.days_offset)}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingRule(rule); setShowModal(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteRule(rule.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && rules.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhuma régua configurada.</p>
        </div>
      )}

      <BillingRuleModal open={showModal} rule={editingRule} onClose={() => { setShowModal(false); setEditingRule(null); }} onSaved={handleSaved} />
    </div>
  );
}
