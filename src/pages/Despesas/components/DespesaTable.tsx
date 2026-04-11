import { useState, useRef, useEffect } from "react";
import { Check, Pencil, Trash2, FileText, FileDown, Clock, ChevronDown } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { OrigemPill } from "./OrigemPill";
import { CategoriaPill } from "./CategoriaPill";
import type { Despesa } from "@/types/expenses";
import type { ExpenseCategory } from "@/hooks/useExpenseCategories";

interface Props {
  despesas: Despesa[];
  categories?: ExpenseCategory[];
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onUpdateCategory: (id: string, category: string, categoryId: string | null) => void;
  onEdit: (d: Despesa) => void;
  onDelete: (id: string) => void;
  totalValue: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR");
};

export function DespesaTable({
  despesas, categories = [], onTogglePaid, onUpdateCategory,
  onEdit, onDelete, totalValue, onExportCSV, onExportPDF,
}: Props) {
  const [categoryDropdownId, setCategoryDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!categoryDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [categoryDropdownId]);

  if (despesas.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: "hsl(var(--muted-foreground))" }}>
        <FileText size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhuma despesa encontrada com os filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
              {["DATA", "FORNECEDOR", "DESCRIÇÃO", "CATEGORIA", "VALOR", "STATUS", "ORIGEM", "ANEXO", "AÇÕES"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] font-semibold uppercase tracking-wider py-3 px-3"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => (
              <tr
                key={d.id}
                className="transition-colors duration-150 hover:bg-[hsl(var(--muted)/0.3)]"
                style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
              >
                <td className="py-3 px-3 whitespace-nowrap" style={{ color: "hsl(var(--muted-foreground))" }}>{fmtDate(d.date)}</td>
                <td className="py-3 px-3 font-medium truncate max-w-[200px]">{d.supplier}</td>
                <td className="py-3 px-3 truncate max-w-[180px]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.description}</td>

                {/* ── Inline category edit ── */}
                <td className="py-3 px-3 relative">
                  <button
                    onClick={() => setCategoryDropdownId(categoryDropdownId === d.id ? null : d.id)}
                    className="flex items-center gap-1 group/cat"
                  >
                    <CategoriaPill categoria={d.category} />
                    <ChevronDown
                      size={10}
                      className="opacity-0 group-hover/cat:opacity-100 transition-opacity"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    />
                  </button>
                  {categoryDropdownId === d.id && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-20 mt-1 py-1 rounded-lg shadow-lg border min-w-[160px]"
                      style={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }}
                    >
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            onUpdateCategory(d.id, cat.name, cat.id);
                            setCategoryDropdownId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-[hsl(var(--muted)/0.5)]"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                          {cat.name}
                          {cat.name === d.category && (
                            <Check size={10} className="ml-auto" style={{ color: "#10B981" }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </td>

                <td className="py-3 px-3 text-right font-medium tabular-nums">{fmt(d.value)}</td>

                {/* ── Inline status toggle ── */}
                <td className="py-3 px-3">
                  <button
                    onClick={() => onTogglePaid(d.id, d.status !== "pago")}
                    className="group/status cursor-pointer"
                    title={d.status === "pago" ? "Marcar como pendente" : "Marcar como pago"}
                  >
                    <StatusPill status={d.status} />
                  </button>
                </td>

                <td className="py-3 px-3"><OrigemPill origem={d.origin} /></td>
                <td className="py-3 px-3 text-center">
                  {d.attachment_url ? (
                    <a href={d.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline text-xs">
                      Ver
                    </a>
                  ) : (
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>—</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(d)} title="Editar" className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted))]">
                      <Pencil size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                    </button>
                    <button onClick={() => onDelete(d.id)} title="Excluir" className="p-1.5 rounded-md transition-colors hover:bg-[rgba(239,68,68,0.15)]">
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {despesas.length} registros · {fmt(totalValue)}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onExportCSV} className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted))]" style={{ color: "hsl(var(--primary))" }}>
            <FileDown size={13} className="inline mr-1" />CSV
          </button>
          <button onClick={onExportPDF} className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted))]" style={{ color: "hsl(var(--primary))" }}>
            <FileDown size={13} className="inline mr-1" />PDF
          </button>
        </div>
      </div>
    </div>
  );
}
