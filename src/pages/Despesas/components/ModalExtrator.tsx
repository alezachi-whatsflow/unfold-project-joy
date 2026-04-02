import { fmtDate } from "@/lib/dateUtils";
import { useState, useRef, useCallback, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Bot, Loader2 } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { OrigemPill } from "./OrigemPill";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE = 10 * 1024 * 1024;

interface ExtractedData {
  supplier: string;
  value: number;
  category: string;
  date: string;
  description: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ExtractedData & { file: File }) => void;
}

const labelCls = "text-xs font-medium mb-1 block";

export function ModalExtrator({ open, onOpenChange, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setProcessing(false);
    setExtracted(null);
  };

  const handleFileSelected = useCallback((f: File) => {
    if (f.size > MAX_SIZE) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setFile(f);
    setExtracted(null);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
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

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    // Simulate AI extraction (Phase 1 mock)
    await new Promise((r) => setTimeout(r, 1500));
    setExtracted({
      supplier: "Fornecedor Extraído (IA)",
      value: 249.90,
      category: "Tecnologia",
      date: new Date().toISOString().split("T")[0],
      description: "Serviço extraído automaticamente por IA",
    });
    setProcessing(false);
  };

  const handleSave = () => {
    if (!extracted || !file) return;
    onSave({ ...extracted, file });
    reset();
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: "rgba(99,102,241,.18)", color: "#818CF8" }}
            >
              IA
            </span>
            <DialogTitle>Extrator de Despesas</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Envie uma nota fiscal ou comprovante e a IA extrairá automaticamente os dados da despesa.
        </p>

        <div className="space-y-4 mt-3">
          {/* Upload dropzone */}
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
              <button
                onClick={reset}
                className="text-xs px-2 py-1 rounded hover:bg-[hsl(var(--muted))]"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Trocar
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
              style={{
                borderColor: dragging ? "#818CF8" : "hsl(var(--border))",
                background: dragging ? "rgba(99,102,241,.05)" : "transparent",
              }}
            >
              <Bot size={28} className="mx-auto mb-2" style={{ color: "#818CF8" }} />
              <p className="text-sm font-medium mb-1">Envie um documento</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Arraste ou clique (JPG, PNG, WebP, PDF - max 10MB)
              </p>
            </div>
          )}

          {/* Extracted data */}
          {extracted && (
            <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                Dados extraídos
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Fornecedor</label>
                  <p className="font-medium">{extracted.supplier}</p>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Valor</label>
                  <p className="font-medium">{fmt(extracted.value)}</p>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Categoria</label>
                  <p className="font-medium">{extracted.category}</p>
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Data</label>
                  <p className="font-medium">{fmtDate(extracted.date + "T00:00:00")}</p>
                </div>
                <div className="col-span-2">
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Descrição</label>
                  <p className="font-medium">{extracted.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Status:</span>
                  <StatusPill status="pago" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Origem:</span>
                  <OrigemPill origem="IA" />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => handleClose(false)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Cancelar
            </button>
            {!extracted ? (
              <button
                onClick={handleProcess}
                disabled={!file || processing}
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ background: "#818CF8" }}
              >
                {processing && <Loader2 size={14} className="animate-spin" />}
                {processing ? "Processando..." : "Processar com IA"}
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{ background: "hsl(var(--primary))" }}
              >
                Salvar Despesa
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
