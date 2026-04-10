import { useState, useMemo } from "react";
import { Customer } from "@/types/customers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Filter, Search, X } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

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
    const q = searchQuery.toLowerCase().trim();
    return customers
      .filter((c) => {
        // Text search
        if (q) {
          const matchName = (c.nome || "").toLowerCase().includes(q);
          const matchEmail = (c.email || "").toLowerCase().includes(q);
          const matchCpf = (c.cpf_cnpj || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
          const matchPhone = (c.telefone || c.phone_lead || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
          if (!matchName && !matchEmail && !matchCpf && !matchPhone) return false;
        }
        // Column filters
        if (filters.status.length && !filters.status.includes(c.status)) return false;
        if (filters.checkout.length && !filters.checkout.includes(c.checkout)) return false;
        if (filters.condicao.length && !filters.condicao.includes(c.condicao || "-")) return false;
        if (filters.whitelabel.length && !filters.whitelabel.includes(c.whitelabel)) return false;
        return true;
      })
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
  }, [customers, filters, searchQuery]);

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

  const clearAll = () => { setFilters(emptyFilters); setSearchQuery(""); };

  return { filters, uniqueValues, filteredCustomers, toggleFilter, clearFilter, activeFilterCount, searchQuery, setSearchQuery, clearAll };
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

// ── Dynamic Filter Dropdown ──
const FILTER_COLUMNS: { key: ColumnFilterKey; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "checkout", label: "Checkout" },
  { key: "condicao", label: "Condição" },
  { key: "whitelabel", label: "Partner" },
];

interface DynamicFilterProps {
  uniqueValues: Record<ColumnFilterKey, string[]>;
  filters: ActiveFilters;
  onToggle: (key: ColumnFilterKey, value: string) => void;
  onClear: (key: ColumnFilterKey) => void;
}

function DynamicFilter({ uniqueValues, filters, onToggle, onClear }: DynamicFilterProps) {
  const [selectedColumn, setSelectedColumn] = useState<ColumnFilterKey | "">("");
  const options = selectedColumn ? uniqueValues[selectedColumn] || [] : [];
  const selected = selectedColumn ? filters[selectedColumn] || [] : [];

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedColumn} onValueChange={(v) => setSelectedColumn(v as ColumnFilterKey)}>
        <SelectTrigger className="h-8 w-[130px] text-xs border-border">
          <SelectValue placeholder="Filtrar por..." />
        </SelectTrigger>
        <SelectContent>
          {FILTER_COLUMNS.map((col) => (
            <SelectItem key={col.key} value={col.key} className="text-xs">{col.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedColumn && (
        <Select
          value={selected.length === 1 ? selected[0] : ""}
          onValueChange={(v) => {
            onClear(selectedColumn);
            if (v) onToggle(selectedColumn, v);
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs border-border">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ── Customer Search Bar ──
interface CustomerSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  uniqueValues: Record<ColumnFilterKey, string[]>;
  filters: ActiveFilters;
  toggleFilter: (key: ColumnFilterKey, value: string) => void;
  clearFilter: (key: ColumnFilterKey) => void;
  clearAll: () => void;
  activeFilterCount: number;
}

export function CustomerSearchBar({
  searchQuery, setSearchQuery,
  uniqueValues, filters, toggleFilter, clearFilter, clearAll, activeFilterCount,
}: CustomerSearchBarProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, email, CPF/CNPJ ou telefone..."
          className="h-8 pl-9 text-xs border-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dynamic filters */}
      <DynamicFilter uniqueValues={uniqueValues} filters={filters} onToggle={toggleFilter} onClear={clearFilter} />
      <DynamicFilter uniqueValues={uniqueValues} filters={filters} onToggle={toggleFilter} onClear={clearFilter} />

      {/* Clear all */}
      {(activeFilterCount > 0 || searchQuery) && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground shrink-0" onClick={clearAll}>
          <X className="h-3 w-3 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}
