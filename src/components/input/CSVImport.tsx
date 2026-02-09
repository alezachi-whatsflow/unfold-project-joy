import { useRef, useState } from "react";
import { useFinancial } from "@/contexts/FinancialContext";
import { FinancialEntry } from "@/types/financial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function parseCSV(csv: string): FinancialEntry[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const entries: FinancialEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < headers.length) continue;

    const get = (key: string) => {
      const idx = headers.indexOf(key.toLowerCase());
      return idx >= 0 ? parseFloat(values[idx]) || 0 : 0;
    };

    const month = values[headers.indexOf("month")] || values[0];
    if (!month || !/^\d{4}-\d{2}$/.test(month)) continue;

    entries.push({
      id: Math.random().toString(36).substring(2, 11),
      month,
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
