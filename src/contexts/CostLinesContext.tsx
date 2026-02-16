import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CostLineTemplate, CostLineEntry, CostLineWithValues, CostBlock } from "@/types/costLines";
import { DEFAULT_COST_LINES, groupByCategory } from "@/lib/costLineTemplates";

interface CostLinesContextType {
  templates: CostLineTemplate[];
  entries: CostLineEntry[];
  addTemplate: (template: Omit<CostLineTemplate, "id" | "isDefault">) => string;
  removeTemplate: (id: string) => void;
  setAmount: (templateId: string, month: string, amount: number) => void;
  getAmount: (templateId: string, month: string) => number;
  grouped: Record<string, CostLineWithValues[]>;
  /** Aggregate amounts by block for a given month */
  getBlockTotals: (month: string) => Record<CostBlock, number>;
  /** Get total for a category in a given month */
  getCategoryTotal: (category: string, month: string) => number;
  months: string[];
  setMonths: (months: string[]) => void;
}

const CostLinesContext = createContext<CostLinesContextType | null>(null);

export function CostLinesProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<CostLineTemplate[]>(DEFAULT_COST_LINES);
  const [entries, setEntries] = useState<CostLineEntry[]>([]);
  const [months, setMonths] = useState<string[]>(() => {
    const now = new Date();
    const result: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`);
    }
    return result;
  });

  const addTemplate = useCallback((t: Omit<CostLineTemplate, "id" | "isDefault">): string => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTemplates((prev) => [...prev, { ...t, id, isDefault: false }]);
    return id;
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id || t.isDefault));
    setEntries((prev) => prev.filter((e) => e.templateId !== id));
  }, []);

  const setAmount = useCallback((templateId: string, month: string, amount: number) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.templateId === templateId && e.month === month);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], amount };
        return copy;
      }
      return [...prev, { templateId, month, amount }];
    });
  }, []);

  const getAmount = useCallback(
    (templateId: string, month: string) => {
      return entries.find((e) => e.templateId === templateId && e.month === month)?.amount ?? 0;
    },
    [entries]
  );

  const grouped = useMemo(() => {
    const byCategory = groupByCategory(templates);
    const result: Record<string, CostLineWithValues[]> = {};
    for (const [cat, tmpls] of Object.entries(byCategory)) {
      result[cat] = tmpls.map((t) => {
        const values: Record<string, number> = {};
        for (const e of entries) {
          if (e.templateId === t.id) values[e.month] = e.amount;
        }
        return { ...t, values };
      });
    }
    return result;
  }, [templates, entries]);

  const getBlockTotals = useCallback(
    (month: string): Record<CostBlock, number> => {
      const totals: Record<CostBlock, number> = {
        CSP: 0, MKT: 0, SAL: 0, "G&A": 0, FIN: 0, TAX: 0, "REV-": 0,
      };
      for (const e of entries) {
        if (e.month !== month) continue;
        const tmpl = templates.find((t) => t.id === e.templateId);
        if (tmpl) totals[tmpl.block] += e.amount;
      }
      return totals;
    },
    [entries, templates]
  );

  const getCategoryTotal = useCallback(
    (category: string, month: string) => {
      return entries
        .filter((e) => {
          if (e.month !== month) return false;
          const t = templates.find((t) => t.id === e.templateId);
          return t?.category === category;
        })
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [entries, templates]
  );

  return (
    <CostLinesContext.Provider
      value={{
        templates,
        entries,
        addTemplate,
        removeTemplate,
        setAmount,
        getAmount,
        grouped,
        getBlockTotals,
        getCategoryTotal,
        months,
        setMonths,
      }}
    >
      {children}
    </CostLinesContext.Provider>
  );
}

export function useCostLines() {
  const ctx = useContext(CostLinesContext);
  if (!ctx) throw new Error("useCostLines must be used within CostLinesProvider");
  return ctx;
}
