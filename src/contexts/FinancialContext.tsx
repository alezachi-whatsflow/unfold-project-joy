import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { FinancialEntry, SaaSMetrics } from "@/types/financial";
import { calculateMetrics } from "@/lib/calculations";
import {
  fetchEntries,
  upsertEntry,
  deleteEntryById,
  importEntriesBatch,
} from "@/lib/supabaseQueries";
import { toast } from "sonner";

export type AnalysisPeriod = 1 | 3 | 6 | 12 | 24 | 36;

export const PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: 1, label: "Mensal" },
  { value: 3, label: "Trimestral" },
  { value: 6, label: "Semestral" },
  { value: 12, label: "Anual" },
  { value: 24, label: "24 Meses" },
  { value: 36, label: "36 Meses" },
];

interface FinancialContextType {
  entries: FinancialEntry[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  analysisPeriod: AnalysisPeriod;
  setAnalysisPeriod: (period: AnalysisPeriod) => void;
  addEntry: (entry: FinancialEntry) => void;
  updateEntry: (id: string, entry: Partial<FinancialEntry>) => void;
  deleteEntry: (id: string) => void;
  importEntries: (entries: FinancialEntry[]) => void;
  currentMetrics: SaaSMetrics | null;
  previousMetrics: SaaSMetrics | null;
  periodMetrics: SaaSMetrics | null;
  allMetrics: { month: string; metrics: SaaSMetrics }[];
  filteredAllMetrics: { month: string; metrics: SaaSMetrics }[];
  filteredEntries: FinancialEntry[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | null>(null);

function averageMetrics(metricsList: SaaSMetrics[]): SaaSMetrics {
  if (metricsList.length === 0) return {} as SaaSMetrics;
  if (metricsList.length === 1) return metricsList[0];
  
  const sum = (key: keyof SaaSMetrics) =>
    metricsList.reduce((acc, m) => acc + (m[key] as number), 0);
  const avg = (key: keyof SaaSMetrics) => sum(key) / metricsList.length;

  return {
    mrr: avg("mrr"),
    arr: avg("arr"),
    cac: avg("cac"),
    ltv: avg("ltv"),
    ltvCacRatio: avg("ltvCacRatio"),
    revenueChurnRate: avg("revenueChurnRate"),
    logoChurnRate: avg("logoChurnRate"),
    grossMargin: avg("grossMargin"),
    netMargin: avg("netMargin"),
    ebitda: avg("ebitda"),
    burnRate: avg("burnRate"),
    runway: avg("runway"),
    grossProfit: avg("grossProfit"),
    netProfit: avg("netProfit"),
    totalRevenue: avg("totalRevenue"),
    totalCosts: avg("totalCosts"),
  };
}

export function FinancialProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("2025-12");
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchEntries();
      setEntries(data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar dados do banco de dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.month.localeCompare(b.month)),
    [entries]
  );

  const allMetrics = useMemo(() => {
    return sortedEntries.map((entry, i) => ({
      month: entry.month,
      metrics: calculateMetrics(
        entry,
        i > 0 ? sortedEntries[i - 1] : undefined
      ),
    }));
  }, [sortedEntries]);

  // Filter entries and metrics by period (last N months ending at selectedMonth)
  const filteredEntries = useMemo(() => {
    const idx = sortedEntries.findIndex((e) => e.month === selectedMonth);
    if (idx === -1) return sortedEntries;
    const start = Math.max(0, idx - analysisPeriod + 1);
    return sortedEntries.slice(start, idx + 1);
  }, [sortedEntries, selectedMonth, analysisPeriod]);

  const filteredAllMetrics = useMemo(() => {
    const idx = allMetrics.findIndex((m) => m.month === selectedMonth);
    if (idx === -1) return allMetrics;
    const start = Math.max(0, idx - analysisPeriod + 1);
    return allMetrics.slice(start, idx + 1);
  }, [allMetrics, selectedMonth, analysisPeriod]);

  // Period-averaged metrics for KPI cards
  const periodMetrics = useMemo(() => {
    if (filteredAllMetrics.length === 0) return null;
    return averageMetrics(filteredAllMetrics.map((m) => m.metrics));
  }, [filteredAllMetrics]);

  const currentMetrics = useMemo(() => {
    const idx = sortedEntries.findIndex((e) => e.month === selectedMonth);
    if (idx === -1) return null;
    return calculateMetrics(
      sortedEntries[idx],
      idx > 0 ? sortedEntries[idx - 1] : undefined
    );
  }, [sortedEntries, selectedMonth]);

  const previousMetrics = useMemo(() => {
    const idx = sortedEntries.findIndex((e) => e.month === selectedMonth);
    if (idx <= 0) return null;
    return calculateMetrics(
      sortedEntries[idx - 1],
      idx > 1 ? sortedEntries[idx - 2] : undefined
    );
  }, [sortedEntries, selectedMonth]);

  const addEntry = useCallback(
    async (entry: FinancialEntry) => {
      try {
        await upsertEntry(entry);
        await loadEntries();
      } catch (err) {
        console.error("Erro ao salvar entrada:", err);
        toast.error("Erro ao salvar dados no banco");
      }
    },
    [loadEntries]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<FinancialEntry>) => {
      try {
        const existing = entries.find((e) => e.id === id);
        if (!existing) return;
        const updated = { ...existing, ...updates };
        await upsertEntry(updated);
        await loadEntries();
      } catch (err) {
        console.error("Erro ao atualizar entrada:", err);
        toast.error("Erro ao atualizar dados no banco");
      }
    },
    [entries, loadEntries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        await deleteEntryById(id);
        await loadEntries();
      } catch (err) {
        console.error("Erro ao deletar entrada:", err);
        toast.error("Erro ao deletar dados do banco");
      }
    },
    [loadEntries]
  );

  const importEntries = useCallback(
    async (newEntries: FinancialEntry[]) => {
      try {
        await importEntriesBatch(newEntries);
        await loadEntries();
        toast.success(`${newEntries.length} registros importados com sucesso!`);
      } catch (err) {
        console.error("Erro ao importar entradas:", err);
        toast.error("Erro ao importar dados para o banco");
      }
    },
    [loadEntries]
  );

  return (
    <FinancialContext.Provider
      value={{
        entries: sortedEntries,
        selectedMonth,
        setSelectedMonth,
        analysisPeriod,
        setAnalysisPeriod,
        addEntry,
        updateEntry,
        deleteEntry,
        importEntries,
        currentMetrics,
        previousMetrics,
        periodMetrics,
        allMetrics,
        filteredAllMetrics,
        filteredEntries,
        isLoading,
        refetch: loadEntries,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const ctx = useContext(FinancialContext);
  if (!ctx)
    throw new Error("useFinancial must be used within FinancialProvider");
  return ctx;
}
