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

const MONTH_NAMES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
  janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

/** Normalise various month formats to YYYY-MM */
function normalizeMonth(raw: string): string | null {
  const s = raw.trim();
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // MM/YYYY or MM-YYYY
  let m = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  // YYYY/MM
  m = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  // Abr/25, Dez/2025, janeiro-2025, etc.
  m = s.match(/^([a-záéíóúçã]+)[/-](\d{2,4})$/i);
  if (m) {
    const mon = MONTH_NAMES[m[1].toLowerCase()];
    if (!mon) return null;
    const year = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${year}-${mon}`;
  }
  return null;
}

function parseCSV(csv: string): FinancialEntry[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  console.log("[CSVImport] Delimiter:", delimiter, "Headers:", headers);
  const entries: FinancialEntry[] = [];

  // find month column — accept "month", "mês", "mes", "período", "periodo"
  const monthAliases = ["month", "mês", "mes", "período", "periodo", "data", "date"];
  let monthIdx = -1;
  for (const alias of monthAliases) {
    const idx = headers.indexOf(alias);
    if (idx >= 0) { monthIdx = idx; break; }
  }
  if (monthIdx === -1) monthIdx = 0; // fallback to first column

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i], delimiter);
    if (values.length < headers.length) continue;

    const get = (key: string) => {
      const idx = headers.indexOf(key.toLowerCase());
      if (idx < 0) return 0;
      const raw = values[idx].replace(/[R$\s.]/g, "").replace(",", ".");
      return parseFloat(raw) || 0;
    };

    const rawMonth = values[monthIdx];
    const month = normalizeMonth(rawMonth || "");
    console.log("[CSVImport] Row", i, "raw:", rawMonth, "→", month);
    if (!month) continue;

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
        csp: get("csp"),
        mkt: get("mkt"),
        sal: get("sal"),
        ga: get("ga"),
        fin: get("fin"),
        tax: get("tax"),
        revDeductions: get("revdeductions"),
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
              csp, mkt, sal, ga, fin, tax, revDeductions,
              totalCustomers, newCustomers, churnedCustomers, cashBalance
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
