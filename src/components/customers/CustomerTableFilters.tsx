import { useState, useMemo } from "react";
import { Customer } from "@/types/customers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type ColumnFilterKey =
  | "status"
  | "checkout"
  | "condicao"
  | "whitelabel";

export interface ActiveFilters {
  status: string[];
  checkout: string[];
  condicao: string[];
  whitelabel: string[];
}

export const emptyFilters: ActiveFilters = {
  status: [],
  checkout: [],
  condicao: [],
  whitelabel: [],
};

export function useCustomerFilters(customers: Customer[]) {
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);

  const uniqueValues = useMemo(() => {
    const vals: Record<ColumnFilterKey, Set<string>> = {
      status: new Set(),
      checkout: new Set(),
      condicao: new Set(),
      whitelabel: new Set(),
    };
    for (const c of customers) {
      if (c.status) vals.status.add(c.status);
      if (c.checkout) vals.checkout.add(c.checkout);
      vals.condicao.add(c.condicao || "-");
      if (c.whitelabel) vals.whitelabel.add(c.whitelabel);
    }
    return {
      status: Array.from(vals.status).sort(),
      checkout: Array.from(vals.checkout).sort(),
      condicao: Array.from(vals.condicao).sort(),
      whitelabel: Array.from(vals.whitelabel).sort(),
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filters.status.length && !filters.status.includes(c.status)) return false;
      if (filters.checkout.length && !filters.checkout.includes(c.checkout)) return false;
      if (filters.condicao.length && !filters.condicao.includes(c.condicao || "-")) return false;
      if (filters.whitelabel.length && !filters.whitelabel.includes(c.whitelabel)) return false;
      return true;
    });
  }, [customers, filters]);

  const toggleFilter = (key: ColumnFilterKey, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const clearFilter = (key: ColumnFilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  };

  const activeFilterCount = Object.values(filters).reduce((s, arr) => s + (arr.length > 0 ? 1 : 0), 0);

  return { filters, uniqueValues, filteredCustomers, toggleFilter, clearFilter, activeFilterCount };
}

interface ColumnFilterPopoverProps {
  label: string;
  filterKey: ColumnFilterKey;
  options: string[];
  selected: string[];
  onToggle: (key: ColumnFilterKey, value: string) => void;
  onClear: (key: ColumnFilterKey) => void;
}

export function ColumnFilterPopover({
  label,
  filterKey,
  options,
  selected,
  onToggle,
  onClear,
}: ColumnFilterPopoverProps) {
  const isActive = selected.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
          {label}
          <ChevronDown className={`h-3 w-3 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`} />
          {isActive && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Filtrar {label}</span>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-[10px] text-muted-foreground"
              onClick={() => onClear(filterKey)}
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-secondary cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => onToggle(filterKey, opt)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
