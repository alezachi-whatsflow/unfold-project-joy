import { useMemo } from "react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useCustomers } from "@/contexts/CustomerContext";
import { SaaSMetrics } from "@/types/financial";

/**
 * Enriches financial metrics with customer-derived MRR and recalculates
 * dependent metrics (totalRevenue, margins, netProfit, etc.).
 */
export function useEnrichedMetrics() {
  const {
    filteredAllMetrics,
    filteredEntries,
    periodMetrics,
    previousMetrics,
    selectedMonth,
    analysisPeriod,
    entries,
    allMetrics,
    isLoading,
    ...financialRest
  } = useFinancial();

  const {
    totalMRR: customerMRR,
    activeCount,
    isLoading: customersLoading,
  } = useCustomers();

  /** Enrich a single SaaSMetrics with customer MRR */
  const enrichMetrics = useMemo(() => {
    return (metrics: SaaSMetrics, csp: number, revDeductions: number, tax: number): SaaSMetrics => {
      if (customerMRR <= 0) return metrics;

      const mrr = customerMRR;
      const arr = mrr * 12;
      const totalRevenue = mrr - revDeductions;
      const grossProfit = totalRevenue - csp;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const totalCosts = metrics.totalCosts;
      const netProfit = totalRevenue - totalCosts;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const ebitda = netProfit + tax;
      const totalCustomers = activeCount > 0 ? activeCount : metrics.mrr > 0 ? metrics.mrr : 1;
      const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;
      const monthlyChurnRate = metrics.revenueChurnRate / 100;
      const ltv = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 24;
      const cac = metrics.cac;
      const ltvCacRatio = cac > 0 ? ltv / cac : 0;
      const burnRate = Math.max(0, totalCosts - totalRevenue);
      const runway = burnRate > 0 ? metrics.runway : 999;

      return {
        ...metrics,
        mrr,
        arr,
        totalRevenue,
        grossProfit,
        grossMargin,
        netProfit,
        netMargin,
        ebitda,
        ltv,
        ltvCacRatio,
        burnRate,
        runway: Math.min(runway, 999),
      };
    };
  }, [customerMRR, activeCount]);

  const enrichedFilteredAllMetrics = useMemo(() => {
    if (customerMRR <= 0) return filteredAllMetrics;

    return filteredAllMetrics.map((m, i) => {
      const entry = filteredEntries[i];
      if (!entry) return m;
      return {
        ...m,
        metrics: enrichMetrics(m.metrics, entry.costs.csp, entry.costs.revDeductions, entry.costs.tax),
      };
    });
  }, [filteredAllMetrics, filteredEntries, customerMRR, enrichMetrics]);

  const enrichedPeriodMetrics = useMemo(() => {
    if (!periodMetrics || customerMRR <= 0) return periodMetrics;
    const avgCsp = filteredEntries.length > 0
      ? filteredEntries.reduce((s, e) => s + e.costs.csp, 0) / filteredEntries.length : 0;
    const avgRevDed = filteredEntries.length > 0
      ? filteredEntries.reduce((s, e) => s + e.costs.revDeductions, 0) / filteredEntries.length : 0;
    const avgTax = filteredEntries.length > 0
      ? filteredEntries.reduce((s, e) => s + e.costs.tax, 0) / filteredEntries.length : 0;
    return enrichMetrics(periodMetrics, avgCsp, avgRevDed, avgTax);
  }, [periodMetrics, filteredEntries, customerMRR, enrichMetrics]);

  return {
    filteredAllMetrics: enrichedFilteredAllMetrics,
    filteredEntries,
    periodMetrics: enrichedPeriodMetrics,
    previousMetrics,
    selectedMonth,
    analysisPeriod,
    entries,
    allMetrics,
    isLoading: isLoading || customersLoading,
    customerMRR,
    activeCount,
    ...financialRest,
  };
}
