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
  FileText, Send, Plus, Settings2, Users, Calendar,
  CreditCard, QrCode, Receipt, Loader2, Check, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface BillingConfig {
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX";
  value: string;
  description: string;
  daysUntilDue: number;
  fineValue: string;
  interestValue: string;
  discountValue: string;
  discountDueDateLimitDays: number;
  postalService: boolean;
}

const DEFAULT_CONFIG: BillingConfig = {
  billingType: "BOLETO",
  value: "",
  description: "",
  daysUntilDue: 5,
  fineValue: "2",
  interestValue: "1",
  discountValue: "0",
  discountDueDateLimitDays: 3,
  postalService: false,
};

interface CreationResult {
  customer: string;
  asaasId: string;
  status: "success" | "error";
  message: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

export function AsaasBillingManagerPanel() {
  const { customers, environment } = useAsaas();
  const [config, setConfig] = useState<BillingConfig>(DEFAULT_CONFIG);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<CreationResult[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.cpf_cnpj && c.cpf_cnpj.includes(customerSearch))
  );

  const toggleCustomer = (asaasId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(asaasId) ? prev.filter((id) => id !== asaasId) : [...prev, asaasId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c) => c.asaas_id));
    }
    setSelectAll(!selectAll);
  };

  const getDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + config.daysUntilDue);
    return date.toISOString().split("T")[0];
  };

  const createBillings = async () => {
    if (selectedCustomers.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }
    if (!config.value || parseFloat(config.value) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setIsCreating(true);
    setResults([]);
    const newResults: CreationResult[] = [];

    for (const customerId of selectedCustomers) {
      const customer = customers.find((c) => c.asaas_id === customerId);
      try {
        const payload: Record<string, unknown> = {
          customer: customerId,
          billingType: config.billingType,
          value: parseFloat(config.value),
          dueDate: getDueDate(),
          description: config.description || `Cobrança - ${customer?.name || customerId}`,
        };

        // Fine & interest for BOLETO
        if (config.billingType === "BOLETO") {
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

        const result = await callAsaasProxy({
          endpoint: "/payments",
          method: "POST",
          params: payload,
          environment,
        });

        newResults.push({
          customer: customer?.name || customerId,
          asaasId: result.id || "",
          status: "success",
          message: "Cobrança criada com sucesso",
          invoiceUrl: result.invoiceUrl,
          bankSlipUrl: result.bankSlipUrl,
        });
      } catch (err) {
        newResults.push({
          customer: customer?.name || customerId,
          asaasId: "",
          status: "error",
          message: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      // Delay between requests to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    setResults(newResults);
    setIsCreating(false);

    const successCount = newResults.filter((r) => r.status === "success").length;
    const errorCount = newResults.filter((r) => r.status === "error").length;

    if (successCount > 0) {
      toast.success(`${successCount} cobrança(s) criada(s) com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} cobrança(s) com erro`);
    }
  };

  const BillingIcon = config.billingType === "CREDIT_CARD" ? CreditCard
    : config.billingType === "PIX" ? QrCode : FileText;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Billing Settings */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Configuração da Cobrança
            </CardTitle>
            <CardDescription className="text-xs">
              Configure os parâmetros para criação automática de cobranças
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

            {/* Boleto-specific settings */}
            {config.billingType === "BOLETO" && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Configurações do Boleto
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Multa (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={config.fineValue}
                      onChange={(e) => setConfig({ ...config, fineValue: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Juros a.m. (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={config.interestValue}
                      onChange={(e) => setConfig({ ...config, interestValue: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Desconto (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
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
                      type="number"
                      min="1"
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

        {/* Customer Selection */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Selecionar Clientes
              {selectedCustomers.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {selectedCustomers.length} selecionado(s)
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Selecione os clientes que receberão a cobrança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Buscar cliente por nome, email ou CPF/CNPJ..."
              className="h-8 text-xs"
            />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={toggleSelectAll}>
                {selectAll ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              {selectedCustomers.length > 0 && (
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => { setSelectedCustomers([]); setSelectAll(false); }}>
                  Limpar seleção
                </Button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded-md border border-border">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {customers.length === 0
                    ? "Nenhum cliente sincronizado. Sincronize os clientes na aba Cobranças primeiro."
                    : "Nenhum cliente encontrado para a busca."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-10 text-xs"></TableHead>
                      <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-xs text-muted-foreground">CPF/CNPJ</TableHead>
                      <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((c) => (
                      <TableRow
                        key={c.asaas_id}
                        className={`border-border cursor-pointer transition-colors ${
                          selectedCustomers.includes(c.asaas_id) ? "bg-primary/5" : "hover:bg-secondary/50"
                        }`}
                        onClick={() => toggleCustomer(c.asaas_id)}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(c.asaas_id)}
                            onChange={() => toggleCustomer(c.asaas_id)}
                            className="rounded border-border"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-medium">{c.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.cpf_cnpj || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.email || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Card className="border-border bg-muted/30">
        <CardContent className="flex items-center justify-between pt-4 pb-4">
          <div className="flex items-center gap-3">
            <BillingIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Criar {selectedCustomers.length} cobrança(s) via{" "}
                {config.billingType === "BOLETO" ? "Boleto" : config.billingType === "PIX" ? "Pix" : "Cartão"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Valor: R$ {config.value || "0,00"} cada • Vencimento: {getDueDate()} • Ambiente: {environment}
              </p>
            </div>
          </div>
          <Button
            onClick={createBillings}
            disabled={isCreating || selectedCustomers.length === 0 || !config.value}
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
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Resultado da Criação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-xs text-muted-foreground">ID Asaas</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Mensagem</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell>
                      {r.status === "success" ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{r.customer}</TableCell>
                    <TableCell className="text-xs font-mono">{r.asaasId || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.message}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-1">
                        {r.invoiceUrl && (
                          <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10">
                              Fatura
                            </Badge>
                          </a>
                        )}
                        {r.bankSlipUrl && (
                          <a href={r.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10">
                              Boleto
                            </Badge>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
