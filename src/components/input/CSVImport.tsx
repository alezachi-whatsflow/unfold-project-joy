import { useRef, useState } from "react";
import { useFinancial } from "@/contexts/FinancialContext";
import { FinancialEntry } from "@/types/financial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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

function parseCSV(csv: string): FinancialEntry[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  console.log("[CSVImport] Delimiter:", delimiter, "Headers:", headers);
  const entries: FinancialEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i], delimiter);
    if (values.length < headers.length) continue;

    const get = (key: string) => {
      const idx = headers.indexOf(key.toLowerCase());
      return idx >= 0 ? parseFloat(values[idx]) || 0 : 0;
    };

    const monthIdx = headers.indexOf("month");
    const month = monthIdx >= 0 ? values[monthIdx] : values[0];
    console.log("[CSVImport] Row", i, "month:", month);
    if (!month || !/^\d{4}-\d{2}$/.test(month.trim())) continue;

    entries.push({
      id: Math.random().toString(36).substring(2, 11),
      month: month.trim(),
      revenue: {
        mrr: get("mrr"),
        newMRR: get("newmrr"),
        expansionMRR: get("expansionmrr"),
        churnedMRR: get("churnedmrr"),
        otherRevenue: get("otherrevenue"),
      },
      costs: {
        fixedCosts: get("fixedcosts"),
        variableCosts: get("variablecosts"),
        infrastructure: get("infrastructure"),
        marketing: get("marketing"),
        taxes: get("taxes"),
      },
      personnel: {
        payroll: get("payroll"),
        benefits: get("benefits"),
        contractors: get("contractors"),
      },
      customers: {
        totalCustomers: get("totalcustomers"),
        newCustomers: get("newcustomers"),
        churnedCustomers: get("churnedcustomers"),
      },
      cashBalance: get("cashbalance"),
    });
  }

  console.log("[CSVImport] Parsed entries:", entries.length);
  return entries;
}

export function CSVImport() {
  const { importEntries } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const entries = parseCSV(csv);
        if (entries.length === 0) {
          toast.error("Nenhum dado válido encontrado no CSV.");
          return;
        }
        importEntries(entries);
        setImported(true);
        toast.success(`${entries.length} meses importados com sucesso!`);
        setTimeout(() => setImported(false), 3000);
      } catch {
        toast.error("Erro ao processar o arquivo CSV.");
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4 text-accent" />
          Importar CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Importe dados financeiros em massa. O CSV deve conter as colunas:{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
              month, mrr, newMRR, expansionMRR, churnedMRR, otherRevenue,
              fixedCosts, variableCosts, infrastructure, marketing, taxes,
              payroll, benefits, contractors, totalCustomers, newCustomers,
              churnedCustomers, cashBalance
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
            onClick={() => fileInputRef.current?.click()}
          >
            {imported ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                Importado!
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Selecionar Arquivo CSV
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
