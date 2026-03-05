import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Settings2, Calendar, CreditCard, QrCode } from "lucide-react";
import type { BillingConfig } from "../AsaasBillingManagerPanel";

interface Props {
  config: BillingConfig;
  setConfig: (config: BillingConfig) => void;
  getDueDate: () => string;
}

export function BillingConfigCard({ config, setConfig, getDueDate }: Props) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Configuração da Cobrança
        </CardTitle>
        <CardDescription className="text-xs">
          Configure os parâmetros para criação de cobranças
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Cobrança</Label>
            <Select
              value={config.billingType}
              onValueChange={(v) => setConfig({ ...config, billingType: v as BillingConfig["billingType"] })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOLETO">
                  <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Boleto</span>
                </SelectItem>
                <SelectItem value="CREDIT_CARD">
                  <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Cartão de Crédito</span>
                </SelectItem>
                <SelectItem value="PIX">
                  <span className="flex items-center gap-1.5"><QrCode className="h-3 w-3" /> Pix</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={config.value}
              onChange={(e) => setConfig({ ...config, value: e.target.value })}
              placeholder="0,00"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Descrição da cobrança (ex: Mensalidade Março/2026)"
            className="text-xs min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Dias até vencimento
            </Label>
            <Input
              type="number"
              min="1"
              value={config.daysUntilDue}
              onChange={(e) => setConfig({ ...config, daysUntilDue: parseInt(e.target.value) || 5 })}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vencimento calculado</Label>
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3">
              <span className="text-xs text-muted-foreground">{getDueDate()}</span>
            </div>
          </div>
        </div>

        {config.billingType === "BOLETO" && (
          <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Configurações do Boleto
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Multa (%)</Label>
                <Input
                  type="number" step="0.01" min="0" max="10"
                  value={config.fineValue}
                  onChange={(e) => setConfig({ ...config, fineValue: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Juros a.m. (%)</Label>
                <Input
                  type="number" step="0.01" min="0" max="10"
                  value={config.interestValue}
                  onChange={(e) => setConfig({ ...config, interestValue: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Desconto (%)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={config.discountValue}
                  onChange={(e) => setConfig({ ...config, discountValue: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {parseFloat(config.discountValue) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[10px]">Dias antes do vencimento para desconto</Label>
                <Input
                  type="number" min="1"
                  value={config.discountDueDateLimitDays}
                  onChange={(e) => setConfig({ ...config, discountDueDateLimitDays: parseInt(e.target.value) || 3 })}
                  className="h-8 text-xs"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Envio pelos Correios</Label>
              <Switch
                checked={config.postalService}
                onCheckedChange={(checked) => setConfig({ ...config, postalService: checked })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
