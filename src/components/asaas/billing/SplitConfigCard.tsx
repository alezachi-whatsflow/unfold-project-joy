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
import { Users, Percent, DollarSign, Plus, AlertCircle } from "lucide-react";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SalesPerson } from "@/types/asaas";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export interface SplitConfig {
  enabled: boolean;
  salespersonId: string;
  walletId: string;
  splitType: "PERCENTAGE" | "FIXED";
  splitValue: string;
}

export const DEFAULT_SPLIT: SplitConfig = {
  enabled: false,
  salespersonId: "",
  walletId: "",
  splitType: "PERCENTAGE",
  splitValue: "",
};

interface Props {
  split: SplitConfig;
  setSplit: (split: SplitConfig) => void;
}

export function SplitConfigCard({ split, setSplit }: Props) {
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
    fetchSalesPeople().then(setSalesPeople).catch(console.error);
  };

  useEffect(() => {
    loadSalesPeople();
  }, []);

  const selectedPerson = salesPeople.find((s) => s.id === split.salespersonId);

  const handleCreatePerson = async () => {
    if (!newPerson.name || !newPerson.asaas_wallet_id) {
      toast.error("Nome e Wallet ID são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("sales_people").insert({
        tenant_id: DEFAULT_TENANT_ID,
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

      // Auto-select the new person
      if (data) {
        setSplit({
          ...split,
          salespersonId: data.id,
          walletId: data.asaas_wallet_id || "",
          splitValue: data.commission_percent ? String(data.commission_percent) : split.splitValue,
        });
      }
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
                Split de Comissão
              </CardTitle>
              <CardDescription className="text-xs">
                Dividir valor da cobrança com vendedor
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Vendedor / Recebedor do Split</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-[10px] text-primary"
                  onClick={() => setShowNewDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                  Novo
                </Button>
              </div>
              <Select
                value={split.salespersonId}
                onValueChange={(v) => {
                  const person = salesPeople.find((s) => s.id === v);
                  setSplit({
                    ...split,
                    salespersonId: v,
                    walletId: person?.asaas_wallet_id || "",
                    splitValue: person?.commission_percent
                      ? String(person.commission_percent)
                      : split.splitValue,
                  });
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o vendedor" />
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
              {salesPeople.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Nenhum vendedor cadastrado. Clique em "Novo" para adicionar.
                </p>
              )}
            </div>

            {selectedPerson && !selectedPerson.asaas_wallet_id && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Vendedor sem Wallet ID. O split não será processado pelo Asaas.
                </p>
              </div>
            )}

            {selectedPerson?.asaas_wallet_id && (
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground">
                  Wallet ID: <span className="font-mono text-foreground">{selectedPerson.asaas_wallet_id}</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo do Split</Label>
                <Select
                  value={split.splitType}
                  onValueChange={(v) => setSplit({ ...split, splitType: v as "PERCENTAGE" | "FIXED" })}
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
                  {split.splitType === "PERCENTAGE" ? "Comissão (%)" : "Valor (R$)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={split.splitType === "PERCENTAGE" ? "100" : undefined}
                  value={split.splitValue}
                  onChange={(e) => setSplit({ ...split, splitValue: e.target.value })}
                  placeholder={split.splitType === "PERCENTAGE" ? "10" : "50.00"}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dialog para cadastrar novo vendedor */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Cadastrar Vendedor / Recebedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                placeholder="Nome do vendedor"
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
                Encontre o Wallet ID na conta Asaas do recebedor em Configurações → Dados da Conta
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão padrão (%)</Label>
              <Input
                type="number"
                step="0.01"
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
