import { useRef, useState, useCallback } from "react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCostLines } from "@/contexts/CostLinesContext";
import { FinancialEntry } from "@/types/financial";
import { CostBlock } from "@/types/costLines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { UnmatchedLinesDialog, UnmatchedLine } from "./UnmatchedLinesDialog";

/* ── CSV helpers ── */

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

/** Parse a Brazilian monetary string like " R$  8.262,42 " → 8262.42 */
function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/* ── Month normalisation ── */

const MONTH_NAMES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
  janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

function normalizeMonth(raw: string): string | null {
  const s = raw.trim().replace(/\.$/, ""); // remove trailing dot e.g. "nov."
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // MM/YYYY
  let m = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  // YYYY/MM
  m = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  // Abr/25, nov./2025, janeiro-2025, etc.
  m = s.match(/^([a-záéíóúçã]+)\.?[/-](\d{2,4})$/i);
  if (m) {
    const mon = MONTH_NAMES[m[1].toLowerCase()];
    if (!mon) return null;
    const year = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${year}-${mon}`;
  }
  return null;
}

/* ── Detect CSV type ── */

function isCostDetailCSV(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase());
  return lower.includes("categoria") && lower.includes("subcategoria");
}

/* ── Cost-detail CSV parser ── */

const VALID_BLOCKS = new Set<string>(["CSP", "MKT", "SAL", "G&A", "FIN", "TAX", "REV-"]);
const COST_TYPE_MAP: Record<string, "fixed" | "variable" | "mixed"> = {
  fixo: "fixed", "fixa": "fixed", variável: "variable", variavel: "variable", misto: "mixed", mista: "mixed",
};

interface CostDetailRow {
  category: string;
  subcategory: string;
  block: CostBlock;
  costType: "fixed" | "variable" | "mixed";
  supplier: string;
  description: string;
  monthValues: Record<string, number>; // YYYY-MM → amount
}

function parseCostDetailCSV(csv: string): { rows: CostDetailRow[]; months: string[] } {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], months: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter);
  const headersLower = headers.map((h) => h.trim().toLowerCase());

  // Find fixed columns
  const catIdx = headersLower.indexOf("categoria");
  const subIdx = headersLower.indexOf("subcategoria");
  const blockIdx = headersLower.findIndex((h) => h === "bloco" || (h.includes("csp") && h.includes("mkt")));
  const typeIdx = headersLower.findIndex((h) => h === "tipo" || h.includes("fixo") || h.includes("variável") || h.includes("variavel"));
  const supplierIdx = headersLower.indexOf("fornecedor");
  const descIdx = headersLower.findIndex((h) => h.includes("descrição") || h.includes("descricao"));

  // Find month columns (everything after the fixed metadata columns)
  const fixedCols = new Set([catIdx, subIdx, blockIdx, typeIdx, supplierIdx, descIdx]);
  const monthCols: { idx: number; month: string }[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (fixedCols.has(i)) continue;
    const normalized = normalizeMonth(headers[i]);
    if (normalized) monthCols.push({ idx: i, month: normalized });
  }

  const months = monthCols.map((mc) => mc.month);
  const rows: CostDetailRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i], delimiter);

    const category = catIdx >= 0 ? values[catIdx]?.trim() : "";
    const subcategory = subIdx >= 0 ? values[subIdx]?.trim() : "";
    if (!category || !subcategory) continue;

    const blockRaw = blockIdx >= 0 ? values[blockIdx]?.trim().toUpperCase() : "";
    const block = VALID_BLOCKS.has(blockRaw) ? (blockRaw as CostBlock) : null;
    if (!block) continue;

    const typeRaw = typeIdx >= 0 ? values[typeIdx]?.trim().toLowerCase() : "variable";
    const costType = COST_TYPE_MAP[typeRaw] ?? "variable";
    const supplier = supplierIdx >= 0 ? values[supplierIdx]?.trim() ?? "" : "";
    const description = descIdx >= 0 ? values[descIdx]?.trim() ?? "" : "";

    const monthValues: Record<string, number> = {};
    for (const mc of monthCols) {
      const amount = parseBRL(values[mc.idx] ?? "0");
      if (amount !== 0) monthValues[mc.month] = amount;
    }

    rows.push({ category, subcategory, block, costType, supplier, description, monthValues });
  }

  return { rows, months };
}

/* ── Financial summary CSV parser (original) ── */

function parseFinancialCSV(csv: string): FinancialEntry[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const entries: FinancialEntry[] = [];

  const monthAliases = ["month", "mês", "mes", "período", "periodo", "data", "date"];
  let monthIdx = -1;
  for (const alias of monthAliases) {
    const idx = headers.indexOf(alias);
    if (idx >= 0) { monthIdx = idx; break; }
  }
  if (monthIdx === -1) monthIdx = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i], delimiter);
    if (values.length < headers.length) continue;

    const get = (key: string) => {
      const idx = headers.indexOf(key.toLowerCase());
      if (idx < 0) return 0;
      return parseBRL(values[idx]);
    };

    const month = normalizeMonth(values[monthIdx] || "");
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
  return entries;
}

/* ── Matching helper ── */

const norm = (s: string) =>
  s.replace(/[\u2013\u2014\u2015\u2012―–—]/g, "-")
    .replace(/\s*&\s*/g, " e ")
    .toLowerCase()
    .trim();

/** Extract the inner name from "Diversos (X)" patterns */
function extractDiversosInner(s: string): string | null {
  const match = s.match(/^diversos\s*\((.+)\)$/i);
  return match ? match[1].trim() : null;
}

function findTemplateId(
  subcategory: string,
  existingTemplates: { id: string; subcategory: string }[],
  createdTemplates: { id: string; subcategory: string }[]
): string | undefined {
  const subNorm = norm(subcategory);

  // 1. Exact match on existing
  let id = existingTemplates.find((t) => norm(t.subcategory) === subNorm)?.id;
  if (id) return id;

  // 2. Match on created during import
  id = createdTemplates.find((c) => norm(c.subcategory) === subNorm)?.id;
  if (id) return id;

  // 3. Match against "Diversos (X)" — if existing template is "Diversos (Estagiarios)", match "Estagiarios"
  id = existingTemplates.find((t) => {
    const inner = extractDiversosInner(norm(t.subcategory));
    return inner && inner === subNorm;
  })?.id;
  if (id) return id;

  // 4. Partial match (substring)
  id = existingTemplates.find(
    (t) => norm(t.subcategory).includes(subNorm) || subNorm.includes(norm(t.subcategory))
  )?.id;

  return id;
}

/* ── Component ── */

export function CSVImport() {
  const { importEntries } = useFinancial();
  const { templates, addTemplate, setAmount, setMonths, months: currentMonths } = useCostLines();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState(false);
  const [unmatchedLines, setUnmatchedLines] = useState<UnmatchedLine[]>([]);
  const [pendingImport, setPendingImport] = useState<{
    matchedRows: CostDetailRow[];
    months: string[];
  } | null>(null);

  const importRows = useCallback(
    (rows: CostDetailRow[], months: string[]) => {
      if (months.length > 0) {
        const allMonths = Array.from(new Set([...currentMonths, ...months])).sort();
        setMonths(allMonths);
      }

      const createdTemplates: { id: string; subcategory: string }[] = [];
      const accumulatedAmounts = new Map<string, number>();

      for (const row of rows) {
        let tmplId = findTemplateId(row.subcategory, templates, createdTemplates);

        if (!tmplId) {
          tmplId = addTemplate({
            category: row.category,
            subcategory: row.subcategory,
            block: row.block,
            costType: row.costType,
            supplier: row.supplier,
            description: row.description,
          });
          createdTemplates.push({ id: tmplId, subcategory: row.subcategory });
        }

        for (const [month, amount] of Object.entries(row.monthValues)) {
          const existing = accumulatedAmounts.get(`${tmplId}::${month}`) ?? 0;
          const newAmount = existing + amount;
          accumulatedAmounts.set(`${tmplId}::${month}`, newAmount);
          setAmount(tmplId, month, newAmount);
        }
      }

      return rows.length;
    },
    [templates, currentMonths, addTemplate, setAmount, setMonths]
  );

  const importCostDetail = useCallback(
    (csv: string) => {
      const { rows, months } = parseCostDetailCSV(csv);
      if (rows.length === 0) {
        toast.error("Nenhuma linha de custo válida encontrada no CSV.");
        return;
      }

      // Split rows: rows with category info can be auto-imported (template will be created);
      // only rows missing category/subcategory need manual classification
      const autoImport: CostDetailRow[] = [];
      const unmatched: CostDetailRow[] = [];

      for (const row of rows) {
        const tmplId = findTemplateId(row.subcategory, templates, []);
        if (tmplId) {
          // Already has a matching template
          autoImport.push(row);
        } else if (row.category && row.category.trim() !== "") {
          // No template but CSV provides category — auto-create
          autoImport.push(row);
        } else {
          // No template and no category info — needs manual classification
          const hasValue = Object.values(row.monthValues).some((v) => v !== 0);
          if (hasValue) {
            unmatched.push(row);
          }
        }
      }

      // Import all auto-importable rows (importRows creates templates as needed)
      if (autoImport.length > 0) {
        importRows(autoImport, months);
      }

      // If there are truly unmatched rows, show dialog
      if (unmatched.length > 0) {
        const unmatchedForDialog: UnmatchedLine[] = unmatched.map((row, i) => ({
          index: i,
          subcategory: row.subcategory,
          description: row.description || row.supplier || "",
          block: row.block,
          monthValues: row.monthValues,
        }));
        setUnmatchedLines(unmatchedForDialog);
        setPendingImport({ matchedRows: unmatched, months });

        if (autoImport.length > 0) {
          toast.success(`${autoImport.length} linhas importadas. ${unmatched.length} linha(s) precisam de classificação.`);
        }
      } else {
        toast.success(`${rows.length} linhas de custo importadas (${months.length} meses)!`);
        setImported(true);
        setTimeout(() => setImported(false), 3000);
      }
    },
    [templates, importRows]
  );

  const handleUnmatchedConfirm = useCallback(
    (selected: { line: UnmatchedLine; category: string }[]) => {
      if (!pendingImport) return;

      const rowsToImport: CostDetailRow[] = selected.map(({ line, category }) => {
        const original = pendingImport.matchedRows[line.index];
        return {
          ...original,
          category,
          subcategory: `Diversos (${original.subcategory})`,
        };
      });

      if (rowsToImport.length > 0) {
        importRows(rowsToImport, pendingImport.months);
        toast.success(`${rowsToImport.length} linha(s) importadas como "Diversos".`);
      }

      setUnmatchedLines([]);
      setPendingImport(null);
      setImported(true);
      setTimeout(() => setImported(false), 3000);
    },
    [pendingImport, importRows]
  );

  const handleUnmatchedCancel = useCallback(() => {
    setUnmatchedLines([]);
    setPendingImport(null);
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const firstLine = csv.trim().split(/\r?\n/)[0] ?? "";
        const delimiter = detectDelimiter(firstLine);
        const headers = splitCSVLine(firstLine, delimiter).map((h) => h.trim().toLowerCase());

        if (isCostDetailCSV(headers)) {
          importCostDetail(csv);
        } else {
          const entries = parseFinancialCSV(csv);
          if (entries.length === 0) {
            toast.error("Nenhum dado válido encontrado no CSV.");
            return;
          }
          importEntries(entries);
          setImported(true);
          setTimeout(() => setImported(false), 3000);
        }
      } catch (err) {
        console.error("[CSVImport] Error:", err);
        toast.error("Erro ao processar o arquivo CSV.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
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
              Importe dados em massa. O sistema detecta automaticamente o formato:
            </p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              <li>
                <strong>Detalhamento de custos</strong> — colunas:{" "}
                <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
                  Categoria, Subcategoria, Bloco, Tipo, Fornecedor, Descrição, mês(es)
                </code>
              </li>
              <li>
                <strong>Resumo financeiro</strong> — colunas:{" "}
                <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
                  month, mrr, csp, mkt, sal, ga, fin, tax…
                </code>
              </li>
            </ul>

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
                  <CheckCircle className="h-4 w-4 text-accent" />
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

      <UnmatchedLinesDialog
        open={unmatchedLines.length > 0}
        lines={unmatchedLines}
        onConfirm={handleUnmatchedConfirm}
        onCancel={handleUnmatchedCancel}
      />
    </>
  );
}
