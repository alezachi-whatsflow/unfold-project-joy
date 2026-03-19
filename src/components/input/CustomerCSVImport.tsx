import { useRef, useState } from "react";
import { useCustomers } from "@/contexts/CustomerContext";
import { useFinancial } from "@/contexts/FinancialContext";
import { Customer } from "@/types/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/]/g, "_")
    .replace(/\s+/g, "_");
}

function parseDate(value: string): string {
  if (!value || value === "-") return "";
  const parts = value.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCustomerCSV(csv: string): Customer[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map(normalizeHeader);
  const customers: Customer[] = [];

  const getIdx = (key: string): number => {
    return headers.findIndex((h) => h.includes(key));
  };

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i], delimiter);

    if (values.length < 3) continue;

    const get = (key: string): string => {
      const idx = getIdx(key);
      return idx >= 0 ? (values[idx] || "").trim() : "";
    };

    const getNum = (key: string): number => {
      const val = get(key);
      return parseFloat(val.replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0;
    };

    // Support both "NOME" and "EMPRESA / TITULAR"
    const nome = get("empresa") || get("titular") || get("nome");
    const email = get("email");
    if (!nome && !email) continue;

    // Date fields - support both old and new column names
    const rawAtivacao = get("ativacao") || get("data_ativacao");
    const rawCancelado = get("cancelado") || get("data_cancelado");
    const rawBloqueio = get("bloqueio");
    const rawDesbloqueio = get("desbloqueio");
    const rawVencimento = get("vencimento") || get("data_cobranca") || get("data_cobr");

    // Value field - support both "VALOR COBRANÇA" and "VALOR ÚLTIMA COBRANÇA"
    const valor = getNum("valor_cobranca") || getNum("valor_ultima_cobranca");

    customers.push({
      id: Math.random().toString(36).substring(2, 11),
      whitelabel: get("whitelabel"),
      nome,
      email,
      cpfCnpj: get("cpf_cnpj") || get("cpf") || get("cnpj") || "",
      status: get("status") || "Ativo",
      dataAtivacao: parseDate(rawAtivacao),
      dataCancelado: parseDate(rawCancelado) || null,
      dataBloqueio: parseDate(rawBloqueio) || null,
      dataDesbloqueio: parseDate(rawDesbloqueio) || null,
      dataVencimento: parseDate(rawVencimento) || null,
      dispositivosOficial: getNum("dispositivos_oficial"),
      dispositivosNaoOficial: getNum("dispositivos_nao_oficial"),
      atendentes: getNum("atendentes"),
      adicional: getNum("adicional"),
      checkout: get("checkout"),
      receita: get("receita"),
      tipoPagamento: get("tipo_pagamento"),
      condicao: get("condicao"),
      valorUltimaCobranca: valor,
      phoneBilling: get("fone_faturamento") || get("phone_billing") || "",
      phoneLead: get("fone_lead") || get("phone_lead") || "",
      phoneCompany: get("fone_empresa") || get("phone_company") || "",
    });
  }

  return customers;
}

export function CustomerCSVImport() {
  const { importCustomers, customers, getCustomerMetricsForMonth, getAvailableMonths } = useCustomers();
  const { entries, importEntries } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string;
        const customers = parseCustomerCSV(csv);
        if (customers.length === 0) {
          toast.error("Nenhum cliente válido encontrado no CSV.");
          setIsImporting(false);
          return;
        }
        await importCustomers(customers);
        setImported(true);
        toast.success(`${customers.length} clientes importados com sucesso!`);
        setTimeout(() => setImported(false), 3000);
      } catch {
        toast.error("Erro ao processar o arquivo CSV.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const syncToFinancial = () => {
    if (customers.length === 0) {
      toast.error("Nenhum cliente importado para sincronizar.");
      return;
    }

    const months = getAvailableMonths();
    if (months.length === 0) {
      toast.error("Nenhum mês disponível nos dados de clientes.");
      return;
    }

    const updatedEntries = months.map((month) => {
      const metrics = getCustomerMetricsForMonth(month);
      const existing = entries.find((e) => e.month === month);
      return {
        id: existing?.id || Math.random().toString(36).substring(2, 11),
        month,
        revenue: {
          mrr: metrics.mrr || existing?.revenue.mrr || 0,
          newMRR: existing?.revenue.newMRR || 0,
          expansionMRR: existing?.revenue.expansionMRR || 0,
          churnedMRR: existing?.revenue.churnedMRR || 0,
          otherRevenue: existing?.revenue.otherRevenue || 0,
        },
        costs: existing?.costs || { csp: 0, mkt: 0, sal: 0, ga: 0, fin: 0, tax: 0, revDeductions: 0 },
        customers: {
          totalCustomers: metrics.totalCustomers,
          newCustomers: metrics.newCustomers,
          churnedCustomers: metrics.churnedCustomers,
        },
        cashBalance: existing?.cashBalance || 0,
      };
    });

    importEntries(updatedEntries);
    toast.success(`Dados de clientes sincronizados para ${months.length} meses!`);
  };

  const hasCustomers = customers.length > 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-accent" />
          Importar Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Importe a lista de clientes via CSV. Colunas suportadas:{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
              WHITELABEL, EMPRESA/TITULAR, EMAIL, STATUS, ATIVAÇÃO,
              CANCELADO, BLOQUEIO, DESBLOQUEIO, VENCIMENTO, DISP. OFICIAL,
              DISP. NÃO OFICIAL, ATENDENTES, ADICIONAL, CHECKOUT, RECEITA,
              TIPO PAGAMENTO, CONDIÇÃO, VALOR COBRANÇA
            </code>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              {imported ? (
                <>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Importado!
                </>
              ) : isImporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Clientes
                </>
              )}
            </Button>

            {hasCustomers && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={syncToFinancial}
              >
                <RefreshCw className="h-3 w-3" />
                Sincronizar com Financeiro
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
