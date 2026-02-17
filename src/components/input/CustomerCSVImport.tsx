import { useRef, useState } from "react";
import { useCustomers } from "@/contexts/CustomerContext";
import { Customer } from "@/types/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, "_");
}

function parseDate(value: string): string {
  if (!value || value === "-") return "";
  // Handle DD/MM/YYYY format
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

    const nome = get("nome");
    const email = get("email");
    if (!nome && !email) continue;

    // Support both "data_ativacao"/"data_desativacao" and "data_desbloqueio"/"data_bloqueio"
    const rawAtivacao = get("data_ativacao") || get("data_desbloqueio");
    const rawDesativacao = get("data_desativacao") || get("data_bloqueio");

    customers.push({
      id: Math.random().toString(36).substring(2, 11),
      whitelabel: get("whitelabel"),
      nome,
      email,
      status: get("status") || "Ativo",
      dataAtivacao: parseDate(rawAtivacao),
      dataDesativacao: parseDate(rawDesativacao) || null,
      dataCobranca: parseDate(get("data_cobr")) || null,
      dispositivosOficial: getNum("dispositivos_oficial"),
      dispositivosNaoOficial: getNum("dispositivos_nao_oficial"),
      atendentes: getNum("atendentes"),
      adicional: getNum("adicional"),
      checkout: get("checkout"),
      receita: get("receita"),
      tipoPagamento: get("tipo_pagamento"),
      condicao: get("condicao"),
      valorUltimaCobranca: getNum("valor_ultima_cobranca"),
    });
  }

  return customers;
}

export function CustomerCSVImport() {
  const { importCustomers } = useCustomers();
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
            Importe a lista de clientes via CSV. O arquivo deve conter as
            colunas:{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
              WHITELABEL, NOME, EMAIL, STATUS, DATA BLOQUEIO, DATA
              DESBLOQUEIO, DATA COBRANÇA, DISP. OFICIAL, DISP. NÃO OFICIAL,
              ATENDENTES, ADICIONAL, CHECKOUT, RECEITA, TIPO PAGAMENTO,
              CONDIÇÃO, VALOR ÚLTIMA COBRANÇA
            </code>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

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
        </div>
      </CardContent>
    </Card>
  );
}
