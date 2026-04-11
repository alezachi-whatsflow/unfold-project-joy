import { jsPDF } from "jspdf";
import { FinancialEntry, SaaSMetrics, COST_BLOCK_LABELS } from "@/types/financial";
import { calculateMetrics, formatCurrency, formatPercent, getMonthFullLabel } from "@/lib/calculations";
import whatsflowLogo from "@/assets/whatsflow-logo.png";

// ── PDF helpers ──────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

let cachedLogo: string | null = null;

async function getLogo(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = await loadImageAsBase64(whatsflowLogo);
  return cachedLogo;
}

function addHeader(pdf: jsPDF, logoBase64: string, title: string, subtitle: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.addImage(logoBase64, "PNG", 10, 8, 20, 20);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, 35, 18);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120);
  pdf.text(subtitle, 35, 24);
  pdf.setTextColor(0);
  pdf.setDrawColor(200);
  pdf.line(10, 32, pageW - 10, 32);
}

function addFooter(pdf: jsPDF, pageNum: number) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text(`IAZIS Finance · Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 10, pageH - 8);
  pdf.text(`Página ${pageNum}`, pageW - 25, pageH - 8);
  pdf.setTextColor(0);
}

function addTableRow(pdf: jsPDF, y: number, cols: string[], widths: number[], isHeader = false, startX = 10) {
  if (isHeader) {
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(240, 240, 240);
    pdf.rect(startX, y - 4, widths.reduce((a, b) => a + b, 0), 6, "F");
  } else {
    pdf.setFont("helvetica", "normal");
  }
  pdf.setFontSize(8);
  let x = startX;
  cols.forEach((col, i) => {
    pdf.text(col, x + 1, y);
    x += widths[i];
  });
  return y + 6;
}

function checkPageBreak(pdf: jsPDF, y: number, logoBase64: string, title: string, pageNum: { n: number }): number {
  const pageH = pdf.internal.pageSize.getHeight();
  if (y > pageH - 20) {
    addFooter(pdf, pageNum.n);
    pageNum.n++;
    pdf.addPage();
    addHeader(pdf, logoBase64, title, `Continuação — pág. ${pageNum.n}`);
    return 40;
  }
  return y;
}

// ── Report generators ────────────────────────────────────────

export async function generateDREReport(entries: FinancialEntry[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const logo = await getLogo();
  const pageNum = { n: 1 };
  const title = "DRE — Demonstrativo de Resultados";

  addHeader(pdf, logo, title, "Relatório mensal consolidado");

  const widths = [35, 25, 25, 25, 25, 25, 25];
  let y = 40;

  y = addTableRow(pdf, y, ["Item", ...entries.slice(-6).map(e => getMonthFullLabel(e.month).slice(0, 7))], widths, true);

  const last6 = entries.slice(-6);
  const metricsArr = last6.map((e, i) => {
    const prev = i > 0 ? last6[i - 1] : entries[entries.indexOf(e) - 1];
    return calculateMetrics(e, prev);
  });

  const rows = [
    { label: "Receita Bruta", vals: last6.map(e => e.revenue.mrr + e.revenue.otherRevenue) },
    { label: "(–) Deduções", vals: last6.map(e => -e.costs.revDeductions) },
    { label: "Receita Líquida", vals: metricsArr.map(m => m.totalRevenue) },
    { label: "(–) CSP", vals: last6.map(e => -e.costs.csp) },
    { label: "Lucro Bruto", vals: metricsArr.map(m => m.grossProfit) },
    { label: "(–) Marketing", vals: last6.map(e => -e.costs.mkt) },
    { label: "(–) Salários", vals: last6.map(e => -e.costs.sal) },
    { label: "(–) G&A", vals: last6.map(e => -e.costs.ga) },
    { label: "(–) Financeiro", vals: last6.map(e => -e.costs.fin) },
    { label: "(–) Impostos", vals: last6.map(e => -e.costs.tax) },
    { label: "Lucro Líquido", vals: metricsArr.map(m => m.netProfit) },
    { label: "Margem Bruta %", vals: metricsArr.map(m => m.grossMargin) },
    { label: "Margem Líq. %", vals: metricsArr.map(m => m.netMargin) },
  ];

  rows.forEach(row => {
    y = checkPageBreak(pdf, y, logo, title, pageNum);
    const isPercent = row.label.includes("%");
    y = addTableRow(pdf, y, [
      row.label,
      ...row.vals.map(v => isPercent ? formatPercent(v) : formatCurrency(v)),
    ], widths);
  });

  addFooter(pdf, pageNum.n);
  pdf.save("DRE_IAZIS.pdf");
}

export async function generateKPIReport(entries: FinancialEntry[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const logo = await getLogo();
  const pageNum = { n: 1 };
  const title = "KPIs SaaS";

  addHeader(pdf, logo, title, "Métricas consolidadas");

  const widths = [35, 25, 25, 25, 25, 25, 25];
  let y = 40;

  const last6 = entries.slice(-6);
  y = addTableRow(pdf, y, ["KPI", ...last6.map(e => getMonthFullLabel(e.month).slice(0, 7))], widths, true);

  const metricsArr = last6.map((e, i) => {
    const prev = i > 0 ? last6[i - 1] : entries[entries.indexOf(e) - 1];
    return calculateMetrics(e, prev);
  });

  const kpis: { label: string; key: keyof SaaSMetrics; format: "currency" | "percent" | "number" }[] = [
    { label: "MRR", key: "mrr", format: "currency" },
    { label: "ARR", key: "arr", format: "currency" },
    { label: "CAC", key: "cac", format: "currency" },
    { label: "LTV", key: "ltv", format: "currency" },
    { label: "LTV/CAC", key: "ltvCacRatio", format: "number" },
    { label: "Churn Receita %", key: "revenueChurnRate", format: "percent" },
    { label: "Churn Logo %", key: "logoChurnRate", format: "percent" },
    { label: "Margem Bruta %", key: "grossMargin", format: "percent" },
    { label: "Margem Líq. %", key: "netMargin", format: "percent" },
    { label: "EBITDA", key: "ebitda", format: "currency" },
    { label: "Burn Rate", key: "burnRate", format: "currency" },
    { label: "Runway (meses)", key: "runway", format: "number" },
  ];

  kpis.forEach(kpi => {
    y = checkPageBreak(pdf, y, logo, title, pageNum);
    y = addTableRow(pdf, y, [
      kpi.label,
      ...metricsArr.map(m => {
        const v = m[kpi.key] as number;
        if (kpi.format === "currency") return formatCurrency(v);
        if (kpi.format === "percent") return formatPercent(v);
        return v.toFixed(1);
      }),
    ], widths);
  });

  addFooter(pdf, pageNum.n);
  pdf.save("KPIs_SaaS_IAZIS.pdf");
}

export async function generateCostBreakdownReport(entries: FinancialEntry[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const logo = await getLogo();
  const pageNum = { n: 1 };
  const title = "Análise de Custos";

  addHeader(pdf, logo, title, "Decomposição por bloco contábil");

  const widths = [35, 25, 25, 25, 25, 25, 25];
  let y = 40;

  const last6 = entries.slice(-6);
  y = addTableRow(pdf, y, ["Bloco", ...last6.map(e => getMonthFullLabel(e.month).slice(0, 7))], widths, true);

  const costKeys: (keyof typeof COST_BLOCK_LABELS)[] = ["csp", "mkt", "sal", "ga", "fin", "tax", "revDeductions"];
  costKeys.forEach(key => {
    y = checkPageBreak(pdf, y, logo, title, pageNum);
    y = addTableRow(pdf, y, [
      COST_BLOCK_LABELS[key].split("—")[0].trim(),
      ...last6.map(e => formatCurrency(e.costs[key])),
    ], widths);
  });

  y += 4;
  y = addTableRow(pdf, y, [
    "TOTAL",
    ...last6.map(e => formatCurrency(Object.values(e.costs).reduce((a, b) => a + b, 0))),
  ], widths, true);

  addFooter(pdf, pageNum.n);
  pdf.save("Custos_IAZIS.pdf");
}

export async function generateCustomerReport(entries: FinancialEntry[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const logo = await getLogo();
  const pageNum = { n: 1 };
  const title = "Relatório de Clientes";

  addHeader(pdf, logo, title, "Evolução da base de clientes");

  const widths = [35, 25, 25, 25, 25, 25, 25];
  let y = 40;

  const last6 = entries.slice(-6);
  y = addTableRow(pdf, y, ["Métrica", ...last6.map(e => getMonthFullLabel(e.month).slice(0, 7))], widths, true);

  const rows = [
    { label: "Total Clientes", vals: last6.map(e => e.customers.totalCustomers.toString()) },
    { label: "Novos", vals: last6.map(e => e.customers.newCustomers.toString()) },
    { label: "Churn", vals: last6.map(e => e.customers.churnedCustomers.toString()) },
    { label: "Net Adds", vals: last6.map(e => (e.customers.newCustomers - e.customers.churnedCustomers).toString()) },
  ];

  rows.forEach(row => {
    y = checkPageBreak(pdf, y, logo, title, pageNum);
    y = addTableRow(pdf, y, [row.label, ...row.vals], widths);
  });

  addFooter(pdf, pageNum.n);
  pdf.save("Clientes_IAZIS.pdf");
}

export async function generateCashFlowReport(entries: FinancialEntry[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const logo = await getLogo();
  const pageNum = { n: 1 };
  const title = "Fluxo de Caixa";

  addHeader(pdf, logo, title, "Posição de caixa e burn rate");

  const widths = [35, 25, 25, 25, 25, 25, 25];
  let y = 40;

  const last6 = entries.slice(-6);
  const metricsArr = last6.map((e, i) => {
    const prev = i > 0 ? last6[i - 1] : entries[entries.indexOf(e) - 1];
    return calculateMetrics(e, prev);
  });

  y = addTableRow(pdf, y, ["Item", ...last6.map(e => getMonthFullLabel(e.month).slice(0, 7))], widths, true);

  const rows = [
    { label: "Receita Total", vals: metricsArr.map(m => formatCurrency(m.totalRevenue)) },
    { label: "Custos Totais", vals: metricsArr.map(m => formatCurrency(m.totalCosts)) },
    { label: "Resultado", vals: metricsArr.map(m => formatCurrency(m.netProfit)) },
    { label: "Burn Rate", vals: metricsArr.map(m => formatCurrency(m.burnRate)) },
    { label: "Saldo Caixa", vals: last6.map(e => formatCurrency(e.cashBalance)) },
    { label: "Runway (meses)", vals: metricsArr.map(m => m.runway.toFixed(1)) },
  ];

  rows.forEach(row => {
    y = checkPageBreak(pdf, y, logo, title, pageNum);
    y = addTableRow(pdf, y, [row.label, ...row.vals], widths);
  });

  addFooter(pdf, pageNum.n);
  pdf.save("FluxoCaixa_IAZIS.pdf");
}

// ── CSV exports ──────────────────────────────────────────────

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDRECSV(entries: FinancialEntry[]) {
  const headers = ["Mês", "Receita Bruta", "Deduções", "Receita Líquida", "CSP", "Lucro Bruto", "Marketing", "Salários", "G&A", "Financeiro", "Impostos", "Lucro Líquido"];
  const rows = entries.map((e, i) => {
    const prev = i > 0 ? entries[i - 1] : undefined;
    const m = calculateMetrics(e, prev);
    return [
      e.month,
      (e.revenue.mrr + e.revenue.otherRevenue).toFixed(2),
      e.costs.revDeductions.toFixed(2),
      m.totalRevenue.toFixed(2),
      e.costs.csp.toFixed(2),
      m.grossProfit.toFixed(2),
      e.costs.mkt.toFixed(2),
      e.costs.sal.toFixed(2),
      e.costs.ga.toFixed(2),
      e.costs.fin.toFixed(2),
      e.costs.tax.toFixed(2),
      m.netProfit.toFixed(2),
    ];
  });
  downloadCSV("DRE_IAZIS.csv", headers, rows);
}

export function exportKPICSV(entries: FinancialEntry[]) {
  const headers = ["Mês", "MRR", "ARR", "CAC", "LTV", "LTV/CAC", "Churn Receita %", "Churn Logo %", "Margem Bruta %", "Margem Líq %", "EBITDA", "Burn Rate", "Runway"];
  const rows = entries.map((e, i) => {
    const prev = i > 0 ? entries[i - 1] : undefined;
    const m = calculateMetrics(e, prev);
    return [e.month, m.mrr.toFixed(2), m.arr.toFixed(2), m.cac.toFixed(2), m.ltv.toFixed(2), m.ltvCacRatio.toFixed(2), m.revenueChurnRate.toFixed(1), m.logoChurnRate.toFixed(1), m.grossMargin.toFixed(1), m.netMargin.toFixed(1), m.ebitda.toFixed(2), m.burnRate.toFixed(2), m.runway.toFixed(1)];
  });
  downloadCSV("KPIs_SaaS_IAZIS.csv", headers, rows);
}

export function exportCostsCSV(entries: FinancialEntry[]) {
  const headers = ["Mês", "CSP", "MKT", "SAL", "G&A", "FIN", "TAX", "REV-", "Total"];
  const rows = entries.map(e => [
    e.month,
    e.costs.csp.toFixed(2), e.costs.mkt.toFixed(2), e.costs.sal.toFixed(2),
    e.costs.ga.toFixed(2), e.costs.fin.toFixed(2), e.costs.tax.toFixed(2),
    e.costs.revDeductions.toFixed(2),
    Object.values(e.costs).reduce((a, b) => a + b, 0).toFixed(2),
  ]);
  downloadCSV("Custos_IAZIS.csv", headers, rows);
}

export function exportCustomersCSV(entries: FinancialEntry[]) {
  const headers = ["Mês", "Total Clientes", "Novos", "Churn", "Net Adds"];
  const rows = entries.map(e => [
    e.month,
    e.customers.totalCustomers.toString(),
    e.customers.newCustomers.toString(),
    e.customers.churnedCustomers.toString(),
    (e.customers.newCustomers - e.customers.churnedCustomers).toString(),
  ]);
  downloadCSV("Clientes_IAZIS.csv", headers, rows);
}

export function exportCashFlowCSV(entries: FinancialEntry[]) {
  const headers = ["Mês", "Receita Total", "Custos Totais", "Resultado", "Burn Rate", "Saldo Caixa", "Runway"];
  const rows = entries.map((e, i) => {
    const prev = i > 0 ? entries[i - 1] : undefined;
    const m = calculateMetrics(e, prev);
    return [e.month, m.totalRevenue.toFixed(2), m.totalCosts.toFixed(2), m.netProfit.toFixed(2), m.burnRate.toFixed(2), e.cashBalance.toFixed(2), m.runway.toFixed(1)];
  });
  downloadCSV("FluxoCaixa_IAZIS.csv", headers, rows);
}
