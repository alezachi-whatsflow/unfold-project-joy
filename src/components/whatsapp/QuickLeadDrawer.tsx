import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickLeadDrawerProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  conversationId?: string;
}

export function QuickLeadDrawer({ open, onClose, contactName, contactPhone, conversationId }: QuickLeadDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: contactName || "",
    cliente_nome: contactName || "",
    valor_total: 359,
    status: "prospeccao",
    consultor_nome: "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.titulo.trim()) { toast.error("Informe o nome do lead"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("negocios").insert({
        titulo: form.titulo,
        cliente_nome: form.cliente_nome,
        valor_total: form.valor_total,
        valor_liquido: form.valor_total,
        status: form.status,
        consultor_nome: form.consultor_nome || null,
        origem: "whatsapp",
        notas: `Criado via WhatsApp. Contato: ${contactPhone}${conversationId ? `\nConversa: ${conversationId}` : ""}`,
        tags: ["WhatsApp"],
        historico: [{
          id: crypto.randomUUID(),
          data: new Date().toISOString(),
          tipo: "status_change",
          descricao: "Lead criado a partir de conversa WhatsApp",
        }],
        probabilidade: 50,
        forma_pagamento: "a_definir",
        condicao_pagamento: "À vista",
        desconto: 0,
        desconto_tipo: "percent",
        gerar_nf: false,
        gerar_cobranca: true,
        produtos: [],
      }).select("id").single();

      if (error) throw error;
      toast.success("Lead criado!", {
        description: `${form.titulo} adicionado ao CRM`,
        action: { label: "Ver no CRM", onClick: () => window.location.href = `/app/whatsflow/vendas` },
      });
      onClose();
    } catch (err: any) {
      toast.error("Erro ao criar lead", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-popover border-l border-border h-full flex flex-col animate-in slide-in-from-right duration-200" style={{ borderRadius: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-primary" />
            <h3 className="text-sm font-semibold">Criar Lead no CRM</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Dados pré-preenchidos da conversa WhatsApp
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">Título do negócio</Label>
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Plano Profissional" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome do cliente</Label>
            <Input value={form.cliente_nome} onChange={(e) => set("cliente_nome", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Telefone</Label>
            <Input value={contactPhone} disabled className="opacity-60" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Valor estimado (R$)</Label>
            <Input type="number" value={form.valor_total} onChange={(e) => set("valor_total", Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Etapa inicial</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospeccao">Prospecção</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Consultor responsável</Label>
            <Input value={form.consultor_nome} onChange={(e) => set("consultor_nome", e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Criando..." : "Criar Lead no CRM"}
          </Button>
        </div>
      </div>
    </div>
  );
}
