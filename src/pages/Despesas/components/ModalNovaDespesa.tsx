import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Image, X, Loader2 } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { SmartCombobox } from "@/components/expenses/SmartCombobox";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import type { Despesa } from "./DespesaTable";

const CATEGORIAS_FALLBACK = ["Transporte", "Escritório", "Tecnologia", "Telecom", "Alimentação", "Outros"];
const STATUS_OPTIONS = ["pendente", "pago", "rejeitado"];
const ACCEPTED = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE = 10 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    supplier: string;
    value: number;
    category: string;
    date: string;
    description: string;
    status: string;
    file: File | null;
  }) => void;
  editingExpense?: Despesa | null;
}

const inputCls = "w-full h-9 rounded-md border px-3 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]";
const selectCls = "w-full h-9 rounded-md border px-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]";
const labelCls = "text-xs font-medium mb-1 block";

export function ModalNovaDespesa({ open, onOpenChange, onSave, editingExpense }: Props) {
  const isEdit = !!editingExpense;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { categories, createCategory } = useExpenseCategories();
  const { suppliers, createSupplier } = useSuppliers();

  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [rawValue, setRawValue] = useState("");
  const [category, setCategory] = useState("Outros");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pendente");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Prefill on edit
  useEffect(() => {
    if (editingExpense) {
      setSupplier(editingExpense.supplier);
      setRawValue(editingExpense.value.toFixed(2).replace(".", ","));
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setDescription(editingExpense.description);
      setStatus(editingExpense.status);
      setFile(null);
      setPreview(null);
    } else {
      setSupplier("");
      setRawValue("");
      setCategory("Outros");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setStatus("pendente");
      setFile(null);
      setPreview(null);
    }
  }, [editingExpense, open]);

  const handleValueChange = (raw: string) => {
    // Allow only digits and comma
    const cleaned = raw.replace(/[^\d,]/g, "");
    setRawValue(cleaned);
  };

  const parseValue = (): number => {
    return parseFloat(rawValue.replace(",", ".")) || 0;
  };

  const handleFileSelected = useCallback((f: File) => {
    if (f.size > MAX_SIZE) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  };

  const handleSubmit = () => {
    if (!supplier || !rawValue) return;
    onSave({
      supplier,
      value: parseValue(),
      category,
      date,
      description,
      status,
      file,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Fornecedor — Smart Combobox with inline create */}
          <div>
            <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Fornecedor *</label>
            <SmartCombobox
              options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              value={supplierId}
              onChange={(id, name) => { setSupplierId(id); setSupplier(name); }}
              onCreateNew={async (name) => {
                const result = await createSupplier.mutateAsync({ name });
                return { id: result.id, name: result.name };
              }}
              placeholder="Buscar ou criar fornecedor..."
            />
          </div>

          {/* Valor + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>R$</span>
                <input
                  value={rawValue}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0,00"
                  className={inputCls + " pl-10"}
                  style={{ borderColor: "hsl(var(--border))" }}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Categoria</label>
              <SmartCombobox
                options={categories.length > 0
                  ? categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))
                  : CATEGORIAS_FALLBACK.map((c) => ({ id: c, name: c }))
                }
                value={categoryId}
                onChange={(id, name) => { setCategoryId(id); setCategory(name); }}
                onCreateNew={async (name) => {
                  const result = await createCategory.mutateAsync(name);
                  return { id: result.id, name: result.name, color: result.color };
                }}
                placeholder="Buscar ou criar..."
              />
            </div>
          </div>

          {/* Data + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                style={{ borderColor: "hsl(var(--border))" }}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da despesa..."
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] resize-none"
              style={{ borderColor: "hsl(var(--border))" }}
            />
          </div>

          {/* Upload dropzone */}
          <div>
            <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Anexo (NF / Comprovante)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 rounded-md border" style={{ borderColor: "hsl(var(--border))" }}>
                {preview ? (
                  <img src={preview} alt="preview" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <FileText size={24} style={{ color: "hsl(var(--muted-foreground))" }} />
                )}
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <button onClick={() => { setFile(null); setPreview(null); }} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragging ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: dragging ? "hsl(var(--primary) / 0.05)" : "transparent",
                }}
              >
                <Upload size={20} className="mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Arraste ou clique para enviar (JPG, PNG, WebP, PDF - max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!supplier || !rawValue}
              className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "hsl(var(--primary))" }}
            >
              {isEdit ? "Atualizar Despesa" : "Salvar Despesa"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
