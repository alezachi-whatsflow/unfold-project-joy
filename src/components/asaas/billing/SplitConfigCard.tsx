import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Percent, DollarSign } from "lucide-react";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import type { SalesPerson } from "@/types/asaas";

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

  useEffect(() => {
    fetchSalesPeople().then(setSalesPeople).catch(console.error);
  }, []);

  const selectedPerson = salesPeople.find((s) => s.id === split.salespersonId);

  return (
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
            <Label className="text-xs">Vendedor</Label>
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
                    {s.name} {s.commission_percent ? `(${s.commission_percent}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {salesPeople.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                Nenhum vendedor cadastrado. Cadastre em Configurações.
              </p>
            )}
          </div>

          {selectedPerson && !selectedPerson.asaas_wallet_id && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
              <p className="text-[10px] text-destructive">
                ⚠️ Vendedor sem Wallet ID configurado. O split não será processado pelo Asaas.
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
  );
}
