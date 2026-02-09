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
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | null>(null);

export function FinancialProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("2025-12");
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
        addEntry,
        updateEntry,
        deleteEntry,
        importEntries,
        currentMetrics,
        previousMetrics,
        allMetrics,
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
