import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Settings2, CalendarIcon, CreditCard, QrCode, Layers, Save, FolderOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BillingConfig } from "../AsaasBillingManagerPanel";

interface Props {
  config: BillingConfig;
  setConfig: (config: BillingConfig) => void;
  getDueDate: () => string;
}

const BILLING_TYPE_LABELS: Record<BillingConfig["billingType"], { label: string; icon: React.ReactNode; description: string }> = {
  UNDEFINED: {
    label: "Boleto + Pix",
    icon: <Layers className="h-3 w-3" />,
    description: "Cliente escolhe entre Boleto ou Pix no checkout",
  },
  BOLETO: {
    label: "Boleto",
    icon: <FileText className="h-3 w-3" />,
    description: "Apenas boleto bancário",
  },
  CREDIT_CARD: {
    label: "Cartão de Crédito",
    icon: <CreditCard className="h-3 w-3" />,
    description: "Cobrança via cartão de crédito",
  },
  PIX: {
    label: "Pix",
    icon: <QrCode className="h-3 w-3" />,
    description: "Apenas Pix com QR Code",
  },
};

interface BillingPreset {
  name: string;
  config: Omit<BillingConfig, "dueDate">;
}

const STORAGE_KEY = "billing_presets";

function loadPresets(): BillingPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: BillingPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function BillingConfigCard({ config, setConfig, getDueDate }: Props) {
  const showBoletoSettings = config.billingType === "BOLETO" || config.billingType === "UNDEFINED";
  const [presets, setPresets] = useState<BillingPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error("Informe um nome para o preset");
      return;
    }
    const { dueDate, ...rest } = config;
    const updated = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), config: rest }];
    setPresets(updated);
    savePresetsToStorage(updated);
    setPresetName("");
    toast.success(`Preset "${presetName.trim()}" salvo`);
  };

  const handleLoadPreset = (preset: BillingPreset) => {
    setConfig({ ...preset.config, dueDate: config.dueDate });
    setShowPresets(false);
    toast.success(`Preset "${preset.name}" carregado`);
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    savePresetsToStorage(updated);
    toast.info(`Preset "${name}" removido`);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Configuração da Cobrança
            </CardTitle>
            <CardDescription className="text-xs">
              Configure os parâmetros para criação de cobranças
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => setShowPresets(!showPresets)}
            >
              <FolderOpen className="h-3 w-3" />
              Presets
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets Area */}
        {showPresets && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
              Configurações Pré-definidas
            </p>
            {presets.length > 0 ? (
              <div className="space-y-1.5">
                {presets.map((p) => (
                  <div key={p.name} className="flex items-center justify-between rounded-md border border-border bg-background p-2">
                    <div>
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {BILLING_TYPE_LABELS[p.config.billingType]?.label} • R$ {p.config.value || "—"} • Multa {p.config.fineValue}% • Juros {p.config.interestValue}%
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleLoadPreset(p)}>
                        Usar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive" onClick={() => handleDeletePreset(p.name)}>
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum preset salvo ainda.</p>
            )}
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nome do preset..."
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSavePreset}>
                <Save className="h-3 w-3" />
                Salvar atual
              </Button>
            </div>
          </div>
        )}

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
                {Object.entries(BILLING_TYPE_LABELS).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-1.5">
                      {icon} {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config.billingType === "UNDEFINED" && (
              <p className="text-[10px] text-muted-foreground">
                O cliente poderá pagar via Boleto ou Pix na mesma cobrança
              </p>
            )}
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

        {/* Date Picker */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" /> Vencimento
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-xs",
                  !config.dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {config.dueDate ? format(config.dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={config.dueDate}
                onSelect={(date) => date && setConfig({ ...config, dueDate: date })}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {showBoletoSettings && (
          <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {config.billingType === "UNDEFINED"
                ? "Configurações do Boleto (aplicadas quando pago via boleto)"
                : "Configurações do Boleto"}
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
