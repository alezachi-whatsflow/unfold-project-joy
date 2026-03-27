import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Percent, DollarSign, Plus, AlertCircle, Trash2, Info } from "lucide-react";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SalesPerson } from "@/types/asaas";
import { useTenantId } from "@/hooks/useTenantId";

export interface SplitRecipient {
  id: string;
  salespersonId: string;
  walletId: string;
  splitType: "PERCENTAGE" | "FIXED";
  splitValue: string;
}

export interface SplitConfig {
  enabled: boolean;
  recipients: SplitRecipient[];
}

let _nextId = 1;
const newRecipient = (): SplitRecipient => ({
  id: `r-${_nextId++}`,
  salespersonId: "",
  walletId: "",
  splitType: "PERCENTAGE",
  splitValue: "",
});

export const DEFAULT_SPLIT: SplitConfig = {
  enabled: false,
  recipients: [newRecipient()],
};

interface Props {
  split: SplitConfig;
  setSplit: (split: SplitConfig) => void;
  billingValue?: number;
}

export function SplitConfigCard({ split, setSplit, billingValue = 0 }: Props) {
  const tenantId = useTenantId();
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newPerson, setNewPerson] = useState({
    name: "",
    email: "",
    asaas_wallet_id: "",
    commission_percent: "",
  });
  const [saving, setSaving] = useState(false);

  const loadSalesPeople = () => {
    fetchSalesPeople(tenantId || "").then(setSalesPeople).catch(console.error);
  };

  useEffect(() => {
    loadSalesPeople();
  }, []);

  const updateRecipient = (id: string, patch: Partial<SplitRecipient>) => {
    setSplit({
      ...split,
      recipients: split.recipients.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    });
  };

  const addRecipient = () => {
    setSplit({ ...split, recipients: [...split.recipients, newRecipient()] });
  };

  const removeRecipient = (id: string) => {
    if (split.recipients.length <= 1) return;
    setSplit({ ...split, recipients: split.recipients.filter((r) => r.id !== id) });
  };

  // Validation helpers
  const totalPercent = split.recipients
    .filter((r) => r.splitType === "PERCENTAGE" && r.splitValue)
    .reduce((sum, r) => sum + parseFloat(r.splitValue || "0"), 0);

  const totalFixed = split.recipients
    .filter((r) => r.splitType === "FIXED" && r.splitValue)
    .reduce((sum, r) => sum + parseFloat(r.splitValue || "0"), 0);

  const hasValidationError = totalPercent > 100 || (billingValue > 0 && totalFixed > billingValue);

  const handleCreatePerson = async () => {
    if (!newPerson.name || !newPerson.asaas_wallet_id) {
      toast.error("Nome e Wallet ID são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("sales_people").insert({
        tenant_id: tenantId || "",
        name: newPerson.name,
        email: newPerson.email || null,
        asaas_wallet_id: newPerson.asaas_wallet_id,
        commission_percent: newPerson.commission_percent
          ? parseFloat(newPerson.commission_percent)
          : null,
        is_active: true,
      }).select().single();

      if (error) throw error;

      toast.success("Vendedor cadastrado com sucesso");
      setShowNewDialog(false);
      setNewPerson({ name: "", email: "", asaas_wallet_id: "", commission_percent: "" });
      loadSalesPeople();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar vendedor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Split de Pagamento
              </CardTitle>
              <CardDescription className="text-xs">
                Dividir valor entre múltiplas carteiras Asaas
              </CardDescription>
            </div>
            <Switch
              checked={split.enabled}
              onCheckedChange={(checked) => setSplit({ ...split, enabled: checked })}
            />
          </div>
        </CardHeader>
        {split.enabled && (
          <CardContent className="space-y-4">
            {/* Info box */}
            <div className="border border-primary/20 bg-primary/5 p-2.5 space-y-1">
              <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                <Info className="h-3 w-3" />
                Como funciona o split
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>O split é calculado sobre o <strong>valor líquido</strong> (netValue) após taxas do Asaas.</li>
                <li>Não inclua sua própria carteira — o saldo restante é creditado automaticamente.</li>
                <li>Percentual: máx 4 casas decimais. Fixo: máx 2 casas decimais.</li>
                <li>Sem limite de recebedores, mas a soma não pode exceder o valor líquido / 100%.</li>
              </ul>
            </div>

            {/* Validation summary */}
            {split.recipients.some((r) => r.splitValue) && (
              <div className={`border p-2 ${hasValidationError ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    Total percentual: <strong className={totalPercent > 100 ? "text-destructive" : "text-foreground"}>{totalPercent.toFixed(2)}%</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Total fixo: <strong className="text-foreground">R$ {totalFixed.toFixed(2)}</strong>
                  </span>
                </div>
                {hasValidationError && (
                  <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {totalPercent > 100
                      ? "A soma dos percentuais não pode exceder 100%."
                      : "A soma dos valores fixos excede o valor da cobrança."}
                  </p>
                )}
              </div>
            )}

            {/* Recipients */}
            {split.recipients.map((recipient, idx) => (
              <RecipientRow
                key={recipient.id}
                index={idx}
                recipient={recipient}
                salesPeople={salesPeople}
                canRemove={split.recipients.length > 1}
                onUpdate={(patch) => updateRecipient(recipient.id, patch)}
                onRemove={() => removeRecipient(recipient.id)}
                onNewPerson={() => setShowNewDialog(true)}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addRecipient}
              className="w-full gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Recebedor
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Dialog para cadastrar novo vendedor */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Cadastrar Recebedor do Split</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                placeholder="Nome do recebedor"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={newPerson.email}
                onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Wallet ID do Asaas *</Label>
              <Input
                value={newPerson.asaas_wallet_id}
                onChange={(e) => setNewPerson({ ...newPerson, asaas_wallet_id: e.target.value })}
                placeholder="Ex: 5a8b3c2d-1e4f-..."
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                O walletId é retornado na criação da subconta via API ou pode ser recuperado via endpoint dedicado.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão padrão (%)</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={newPerson.commission_percent}
                onChange={(e) => setNewPerson({ ...newPerson, commission_percent: e.target.value })}
                placeholder="10"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreatePerson} disabled={saving}>
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Recipient Row Component ──

function RecipientRow({
  index,
  recipient,
  salesPeople,
  canRemove,
  onUpdate,
  onRemove,
  onNewPerson,
}: {
  index: number;
  recipient: SplitRecipient;
  salesPeople: SalesPerson[];
  canRemove: boolean;
  onUpdate: (patch: Partial<SplitRecipient>) => void;
  onRemove: () => void;
  onNewPerson: () => void;
}) {
  const selectedPerson = salesPeople.find((s) => s.id === recipient.salespersonId);

  return (
    <div className="border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Recebedor #{index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Salesperson selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Vendedor / Recebedor</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px] text-primary"
            onClick={onNewPerson}
          >
            <Plus className="h-3 w-3" />
            Novo
          </Button>
        </div>
        <Select
          value={recipient.salespersonId}
          onValueChange={(v) => {
            const person = salesPeople.find((s) => s.id === v);
            onUpdate({
              salespersonId: v,
              walletId: person?.asaas_wallet_id || "",
              splitValue: person?.commission_percent
                ? String(person.commission_percent)
                : recipient.splitValue,
            });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione o recebedor" />
          </SelectTrigger>
          <SelectContent>
            {salesPeople.filter((s) => s.is_active).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  {s.name}
                  {s.commission_percent ? ` (${s.commission_percent}%)` : ""}
                  {!s.asaas_wallet_id && (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Wallet ID warning / display */}
      {selectedPerson && !selectedPerson.asaas_wallet_id && (
        <div className="border border-destructive/30 bg-destructive/5 p-2">
          <p className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Sem Wallet ID. O split não será processado.
          </p>
        </div>
      )}

      {selectedPerson?.asaas_wallet_id && (
        <div className="border border-border bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">
            Wallet ID: <span className="font-mono text-foreground">{selectedPerson.asaas_wallet_id}</span>
          </p>
        </div>
      )}

      {/* Or manual wallet ID */}
      {!recipient.salespersonId && (
        <div className="space-y-1.5">
          <Label className="text-xs">Ou informe o Wallet ID manualmente</Label>
          <Input
            value={recipient.walletId}
            onChange={(e) => onUpdate({ walletId: e.target.value })}
            placeholder="Wallet ID da conta Asaas"
            className="h-9 text-xs font-mono"
          />
        </div>
      )}

      {/* Split type + value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={recipient.splitType}
            onValueChange={(v) => onUpdate({ splitType: v as "PERCENTAGE" | "FIXED" })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">
                <span className="flex items-center gap-1.5"><Percent className="h-3 w-3" /> Percentual</span>
              </SelectItem>
              <SelectItem value="FIXED">
                <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Valor Fixo</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            {recipient.splitType === "PERCENTAGE" ? "Comissão (%)" : "Valor (R$)"}
          </Label>
          <Input
            type="number"
            step={recipient.splitType === "PERCENTAGE" ? "0.0001" : "0.01"}
            min="0"
            max={recipient.splitType === "PERCENTAGE" ? "100" : undefined}
            value={recipient.splitValue}
            onChange={(e) => onUpdate({ splitValue: e.target.value })}
            placeholder={recipient.splitType === "PERCENTAGE" ? "10" : "50.00"}
            className="h-9 text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            {recipient.splitType === "PERCENTAGE"
              ? "Máx 4 casas decimais (ex: 92.3444)"
              : "Máx 2 casas decimais (ex: 9.32)"}
          </p>
        </div>
      </div>
    </div>
  );
}
