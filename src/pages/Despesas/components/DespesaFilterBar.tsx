import { Search, X } from "lucide-react";

interface Filters {
  search: string;
  periodo: string;
  categoria: string;
  status: string;
  origem: string;
}

interface CategoryOption {
  name: string;
}

interface Props {
  filters: Filters;
  onFilterChange: (f: Partial<Filters>) => void;
  onClear: () => void;
  categories?: CategoryOption[];
}

const STATUS = ["", "pendente", "pago", "rejeitado"];
const ORIGENS = ["", "IA", "Manual"];
const PERIODOS = [
  { value: "", label: "Todo período" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "3_meses", label: "Últimos 3 meses" },
];

const selectCls = "h-9 rounded-md border px-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]";

export function DespesaFilterBar({ filters, onFilterChange, onClear, categories = [] }: Props) {
  const hasFilters = filters.search || filters.periodo || filters.categoria || filters.status || filters.origem;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
        <input
          type="text"
          placeholder="Fornecedor ou descrição..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="w-full h-9 rounded-md border pl-8 pr-3 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
          style={{ borderColor: "hsl(var(--border))" }}
        />
      </div>
      <select value={filters.periodo} onChange={(e) => onFilterChange({ periodo: e.target.value })} className={selectCls} style={{ borderColor: "hsl(var(--border))" }}>
        {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <select value={filters.categoria} onChange={(e) => onFilterChange({ categoria: e.target.value })} className={selectCls} style={{ borderColor: "hsl(var(--border))" }}>
        <option value="">Categorias</option>
        {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
      <select value={filters.status} onChange={(e) => onFilterChange({ status: e.target.value })} className={selectCls} style={{ borderColor: "hsl(var(--border))" }}>
        <option value="">Status</option>
        {STATUS.filter(Boolean).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
      <select value={filters.origem} onChange={(e) => onFilterChange({ origem: e.target.value })} className={selectCls} style={{ borderColor: "hsl(var(--border))" }}>
        <option value="">Origem</option>
        {ORIGENS.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasFilters && (
        <button onClick={onClear} className="h-9 px-3 rounded-md text-xs font-medium flex items-center gap-1 transition-colors hover:bg-[hsl(var(--muted))]" style={{ color: "hsl(var(--muted-foreground))" }}>
          <X size={12} /> Limpar
        </button>
      )}
    </div>
  );
}

export type { Filters };
