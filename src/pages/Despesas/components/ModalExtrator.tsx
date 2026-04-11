import { useState, useRef, useCallback, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Bot, Loader2, AlertTriangle } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { OrigemPill } from "./OrigemPill";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE = 10 * 1024 * 1024;

interface ExtractedData {
  supplier: string;
  value: number;
  category: string;
  date: string;
  description: string;
  confidence: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { supplier: string; value: number; category: string; date: string; description: string; file: File }) => void;
}

const labelCls = "text-xs font-medium mb-1 block";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR");
};

export function ModalExtrator({ open, onOpenChange, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Allow editing extracted fields before saving
  const [editSupplier, setEditSupplier] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const reset = () => {
    setFile(null);
    setPreview(null);
    setProcessing(false);
    setExtracted(null);
    setError(null);
  };

  const handleFileSelected = useCallback((f: File) => {
    if (f.size > MAX_SIZE) {
      setError("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setFile(f);
    setExtracted(null);
    setError(null);
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
    setError(null);

    try {
      // 1. Upload file to storage to get a public URL
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `ocr/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from("expense-attachments")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw new Error("Upload falhou: " + uploadErr.message);

      const { data: urlData } = supabase.storage
        .from("expense-attachments")
        .getPublicUrl(uploaded.path);

      const imageUrl = urlData.publicUrl;

      // 2. Call the extraction edge function
      const { data: result, error: fnErr } = await supabase.functions.invoke("extract-expense-ocr", {
        body: { image_url: imageUrl },
      });

      if (fnErr) throw new Error(fnErr.message || "Erro na extração");
      if (!result?.success) throw new Error(result?.error || "Resposta inválida da IA");

      const d = result.data;
      setExtracted({
        supplier: d.supplier,
        value: d.value,
        category: d.category,
        date: d.date,
        description: d.description,
        confidence: d.confidence,
      });

      // Prefill editable fields
      setEditSupplier(d.supplier);
      setEditValue(String(d.value));
      setEditCategory(d.category);
      setEditDate(d.date);
      setEditDescription(d.description);
    } catch (err: any) {
      console.error("[ModalExtrator] Error:", err);
      setError(err.message || "Erro ao processar imagem");
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (!file) return;
    onSave({
      supplier: editSupplier || extracted?.supplier || "",
      value: parseFloat(editValue) || extracted?.value || 0,
      category: editCategory || extracted?.category || "Outros",
      date: editDate || extracted?.date || new Date().toISOString().split("T")[0],
      description: editDescription || extracted?.description || "",
      file,
    });
    reset();
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const confidence = extracted?.confidence ?? 0;
  const confPct = Math.round(confidence * 100);
  const confColor = confPct >= 80 ? "#10B981" : confPct >= 50 ? "#F59E0B" : "#EF4444";

  const inputCls = "w-full h-8 rounded-md border px-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]";

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

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle size={16} color="#EF4444" />
              <span className="text-xs" style={{ color: "#EF4444" }}>{error}</span>
            </div>
          )}

          {/* Extracted data — editable fields */}
          {extracted && (
            <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Dados extraídos
                </p>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${confColor}15`, color: confColor }}
                >
                  {confPct}% confiança
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Fornecedor</label>
                  <input
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className={inputCls}
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Valor (R$)</label>
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className={inputCls}
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Categoria</label>
                  <input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={inputCls}
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Data</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={inputCls}
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls} style={{ color: "hsl(var(--muted-foreground))" }}>Descrição</label>
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={inputCls}
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
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

              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Revise e ajuste os dados antes de salvar. Campos editáveis.
              </p>
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
                {processing ? "Extraindo..." : "Processar com IA"}
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
