import { useState } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Send, Settings2, Users, Calendar,
  CreditCard, QrCode, Receipt, Loader2, Check, AlertCircle,
  Zap, MousePointerClick, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Sub-components ──

import { BillingConfigCard } from "./billing/BillingConfigCard";
import { CustomerSelectionCard } from "./billing/CustomerSelectionCard";
import { BillingResultsCard } from "./billing/BillingResultsCard";
import { SplitConfigCard, DEFAULT_SPLIT, type SplitConfig } from "./billing/SplitConfigCard";
import { PaymentArtifactsDialog } from "./billing/PaymentArtifactsDialog";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export interface BillingConfig {
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  value: string;
  description: string;
  daysUntilDue: number;
  fineValue: string;
  interestValue: string;
  discountValue: string;
  discountDueDateLimitDays: number;
  postalService: boolean;
}

export const DEFAULT_CONFIG: BillingConfig = {
  billingType: "UNDEFINED",
  value: "",
  description: "",
  daysUntilDue: 5,
  fineValue: "2",
  interestValue: "1",
  discountValue: "0",
  discountDueDateLimitDays: 3,
  postalService: false,
};

export interface CreationResult {
  customer: string;
  asaasId: string;
  status: "success" | "error";
  message: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeImage?: string;
  pixCopyPaste?: string;
}

type BillingMode = "manual" | "automatic";

export function AsaasBillingManagerPanel() {
  const { customers, environment } = useAsaas();
  const [config, setConfig] = useState<BillingConfig>(DEFAULT_CONFIG);
  const [split, setSplit] = useState<SplitConfig>(DEFAULT_SPLIT);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<CreationResult[]>([]);
  const [mode, setMode] = useState<BillingMode>("manual");
  const [artifactResult, setArtifactResult] = useState<CreationResult | null>(null);
  const [artifactOpen, setArtifactOpen] = useState(false);

  const getDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + config.daysUntilDue);
    return date.toISOString().split("T")[0];
  };

  // In automatic mode, use all customers; in manual, use selected
  const targetCustomerIds = mode === "automatic"
    ? customers.map((c) => c.asaas_id)
    : selectedCustomers;

  const createBillings = async () => {
    if (targetCustomerIds.length === 0) {
      toast.error(mode === "automatic"
        ? "Nenhum cliente sincronizado. Sincronize os clientes primeiro."
        : "Selecione pelo menos um cliente");
      return;
    }
    if (!config.value || parseFloat(config.value) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setIsCreating(true);
    setResults([]);
    const newResults: CreationResult[] = [];

    for (const customerId of targetCustomerIds) {
      const customer = customers.find((c) => c.asaas_id === customerId);
      try {
        const payload: Record<string, unknown> = {
          customer: customerId,
          billingType: config.billingType,
          value: parseFloat(config.value),
          dueDate: getDueDate(),
          description: config.description || `Cobrança - ${customer?.name || customerId}`,
        };

        if (config.billingType === "BOLETO" || config.billingType === "UNDEFINED") {
          if (parseFloat(config.fineValue) > 0) {
            payload.fine = { value: parseFloat(config.fineValue), type: "PERCENTAGE" };
          }
          if (parseFloat(config.interestValue) > 0) {
            payload.interest = { value: parseFloat(config.interestValue), type: "PERCENTAGE" };
          }
          if (parseFloat(config.discountValue) > 0) {
            payload.discount = {
              value: parseFloat(config.discountValue),
              type: "PERCENTAGE",
              dueDateLimitDays: config.discountDueDateLimitDays,
            };
          }
          payload.postalService = config.postalService;
        }

        // Add split if enabled — supports multiple recipients per Asaas API
        if (split.enabled && split.recipients.length > 0) {
          const validRecipients = split.recipients.filter((r) => r.walletId && r.splitValue);
          if (validRecipients.length > 0) {
            payload.split = validRecipients.map((r) => {
              const entry: Record<string, unknown> = { walletId: r.walletId };
              if (r.splitType === "PERCENTAGE") {
                entry.percentualValue = parseFloat(parseFloat(r.splitValue).toFixed(4));
              } else {
                entry.fixedValue = parseFloat(parseFloat(r.splitValue).toFixed(2));
              }
              return entry;
            });
          }
        }

        const result = await callAsaasProxy({
          endpoint: "/payments",
          method: "POST",
          params: payload,
          environment,
        });

        // Save splits to local DB
        if (split.enabled && result.id) {
          const validRecipients = split.recipients.filter((r) => r.walletId && r.splitValue);
          if (validRecipients.length > 0) {
            const { data: localPayment } = await supabase
              .from("asaas_payments")
              .select("id")
              .eq("asaas_id", result.id)
              .maybeSingle();

            if (localPayment?.id) {
              for (const r of validRecipients) {
                const splitVal = parseFloat(r.splitValue);
                const totalValue = r.splitType === "PERCENTAGE"
                  ? (parseFloat(config.value) * splitVal) / 100
                  : splitVal;

                await supabase.from("asaas_splits").insert({
                  tenant_id: DEFAULT_TENANT_ID,
                  payment_id: localPayment.id,
                  salesperson_id: r.salespersonId || null,
                  wallet_id: r.walletId,
                  percent_value: r.splitType === "PERCENTAGE" ? splitVal : null,
                  fixed_value: r.splitType === "FIXED" ? splitVal : null,
                  total_value: totalValue,
                  status: "PENDING",
                });
              }
            }
          }
        }

        newResults.push({
          customer: customer?.name || customerId,
          asaasId: result.id || "",
          status: "success",
          message: "Cobrança criada com sucesso",
          invoiceUrl: result.invoiceUrl,
          bankSlipUrl: result.bankSlipUrl,
          pixQrCodeImage: result.pixQrCodeImage || undefined,
          pixCopyPaste: result.pixCopyPaste || undefined,
        });
      } catch (err) {
        newResults.push({
          customer: customer?.name || customerId,
          asaasId: "",
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setResults(newResults);
    setIsCreating(false);

    const successCount = newResults.filter((r) => r.status === "success").length;
    const errorCount = newResults.filter((r) => r.status === "error").length;

    if (successCount > 0) toast.success(`${successCount} cobrança(s) criada(s) com sucesso`);
    if (errorCount > 0) toast.error(`${errorCount} cobrança(s) com erro`);
  };

  const billingTypeLabel = config.billingType === "UNDEFINED" ? "Boleto+Pix"
    : config.billingType === "CREDIT_CARD" ? "Cartão"
    : config.billingType === "PIX" ? "Pix" : "Boleto";

  const BillingIcon = config.billingType === "CREDIT_CARD" ? CreditCard
    : config.billingType === "PIX" ? QrCode : FileText;

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Modo de Criação</p>
              <p className="text-[10px] text-muted-foreground">
                Escolha como as cobranças serão geradas
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === "automatic" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("automatic")}
                className="gap-1.5 text-xs"
              >
                <Zap className="h-3.5 w-3.5" />
                Automático (Todos)
              </Button>
              <Button
                variant={mode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("manual")}
                className="gap-1.5 text-xs"
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Manual (Selecionar)
              </Button>
            </div>
          </div>

          {mode === "automatic" && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Modo automático ativo
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                A cobrança será criada para <strong>todos os {customers.length} clientes</strong> sincronizados.
                Configure o valor e os parâmetros abaixo e clique em "Criar Cobranças".
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <div className={`grid gap-6 ${mode === "manual" ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        <div className="space-y-6">
          <BillingConfigCard config={config} setConfig={setConfig} getDueDate={getDueDate} />
          <SplitConfigCard split={split} setSplit={setSplit} />
        </div>

        {mode === "manual" && (
          <CustomerSelectionCard
            customers={customers}
            selectedCustomers={selectedCustomers}
            setSelectedCustomers={setSelectedCustomers}
          />
        )}
      </div>

      {/* Action Button */}
      <Card className="border-border bg-muted/30">
        <CardContent className="flex items-center justify-between pt-4 pb-4">
          <div className="flex items-center gap-3">
            <BillingIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Criar {targetCustomerIds.length} cobrança(s) via {billingTypeLabel}
                {split.enabled && ` + Split (${split.recipients.filter((r) => r.walletId).length} recebedor(es))`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Valor: R$ {config.value || "0,00"} cada • Vencimento: {getDueDate()} • Modo: {mode === "automatic" ? "Automático" : "Manual"} • Ambiente: {environment}
              </p>
            </div>
          </div>
          <Button
            onClick={createBillings}
            disabled={isCreating || targetCustomerIds.length === 0 || !config.value}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Criar Cobranças
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <BillingResultsCard
          results={results}
          onViewArtifacts={(r) => { setArtifactResult(r); setArtifactOpen(true); }}
        />
      )}

      {/* Artifacts Dialog */}
      <PaymentArtifactsDialog
        open={artifactOpen}
        onOpenChange={setArtifactOpen}
        result={artifactResult}
      />
    </div>
  );
}
