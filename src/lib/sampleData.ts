import { FinancialEntry } from "@/types/financial";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function generateSampleData(): FinancialEntry[] {
  const base = [
    { month: "2025-01", mrr: 52000, customers: 110, cash: 450000 },
    { month: "2025-02", mrr: 56000, customers: 118, cash: 420000 },
    { month: "2025-03", mrr: 61000, customers: 128, cash: 405000 },
    { month: "2025-04", mrr: 68000, customers: 140, cash: 395000 },
    { month: "2025-05", mrr: 74000, customers: 152, cash: 390000 },
    { month: "2025-06", mrr: 82000, customers: 165, cash: 400000 },
    { month: "2025-07", mrr: 89000, customers: 178, cash: 415000 },
    { month: "2025-08", mrr: 95000, customers: 190, cash: 440000 },
    { month: "2025-09", mrr: 102000, customers: 205, cash: 470000 },
    { month: "2025-10", mrr: 110000, customers: 218, cash: 510000 },
    { month: "2025-11", mrr: 116000, customers: 230, cash: 555000 },
    { month: "2025-12", mrr: 125000, customers: 245, cash: 610000 },
  ];

  return base.map((d, i) => {
    const churnedCustomers = Math.floor(d.customers * 0.02);
    const newCustomers =
      i === 0
        ? 15
        : d.customers - base[i - 1].customers + churnedCustomers;
    const churnedMRR = Math.floor(d.mrr * 0.03);
    const totalNewMRR =
      i === 0 ? 8000 : d.mrr - base[i - 1].mrr + churnedMRR;
    const expansionMRR = Math.floor(totalNewMRR * 0.3);

    return {
      id: generateId(),
      month: d.month,
      revenue: {
        mrr: d.mrr,
        newMRR: totalNewMRR - expansionMRR,
        expansionMRR,
        churnedMRR,
        otherRevenue: Math.floor(d.mrr * 0.05),
      },
      costs: {
        fixedCosts: 15000 + i * 500,
        variableCosts: Math.floor(d.mrr * 0.12),
        infrastructure: 8000 + i * 300,
        marketing: 18000 + i * 800,
        taxes: Math.floor(d.mrr * 0.08),
      },
      personnel: {
        payroll: 35000 + Math.floor(i / 3) * 5000,
        benefits: 7000 + Math.floor(i / 3) * 1000,
        contractors: 5000 + i * 200,
      },
      customers: {
        totalCustomers: d.customers,
        newCustomers,
        churnedCustomers,
      },
      cashBalance: d.cash,
    };
  });
}
