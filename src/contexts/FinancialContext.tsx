import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { FinancialEntry, SaaSMetrics } from "@/types/financial";
import { calculateMetrics } from "@/lib/calculations";
import { generateSampleData } from "@/lib/sampleData";

interface FinancialContextType {
  entries: FinancialEntry[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  addEntry: (entry: FinancialEntry) => void;
  updateEntry: (id: string, entry: Partial<FinancialEntry>) => void;
  deleteEntry: (id: string) => void;
  importEntries: (entries: FinancialEntry[]) => void;
  currentMetrics: SaaSMetrics | null;
  previousMetrics: SaaSMetrics | null;
  allMetrics: { month: string; metrics: SaaSMetrics }[];
}

const FinancialContext = createContext<FinancialContextType | null>(null);

export function FinancialProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<FinancialEntry[]>(
    generateSampleData()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("2025-12");

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

  const addEntry = useCallback((entry: FinancialEntry) => {
    setEntries((prev) => [
      ...prev.filter((e) => e.month !== entry.month),
      entry,
    ]);
  }, []);

  const updateEntry = useCallback(
    (id: string, updates: Partial<FinancialEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const importEntries = useCallback((newEntries: FinancialEntry[]) => {
    setEntries((prev) => {
      const existingMonths = new Set(newEntries.map((e) => e.month));
      const filtered = prev.filter((e) => !existingMonths.has(e.month));
      return [...filtered, ...newEntries];
    });
  }, []);

  return (
    <FinancialContext.Provider
      value={{
        entries: sortedEntries,
        selectedMonth,
        setSelectedMonth,
        addEntry,
        updateEntry,
        deleteEntry,
        importEntries,
        currentMetrics,
        previousMetrics,
        allMetrics,
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
