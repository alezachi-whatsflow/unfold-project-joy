import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Loader2, CalendarIcon, Paperclip, Download, Share2, FileText, Image, X } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DEFAULT_COST_LINES } from "@/lib/costLineTemplates";
import { cn } from "@/lib/utils";

import { useTenantId } from "@/hooks/useTenantId";
const CATEGORIES = ["Pessoal", "Software", "Marketing", "Infraestrutura", "Impostos", "Comissões", "Despesas Comerciais", "Despesas Financeiras", "Custos de Prestação do Serviço (CSP)", "Salários / Pessoal", "General & Administrative", "Outros"];
const INSTALLMENT_OPTIONS = ["À vista", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "11x", "12x"];
const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Transferência", "Dinheiro", "Outro"];
const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.bmp,.gif,.webp,.tiff,.csv";

interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  supplier: string | null;
  cost_center: string | null;
  reference_code: string | null;
  installments: string | null;
  due_date: string | null;
  payment_method: string | null;
  payment_account: string | null;
  is_paid: boolean;
  is_scheduled: boolean;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
}

const defaultForm = {
  description: "",
  value: "",
  date: format(new Date(), "yyyy-MM-dd"),
  category: "Outros",
  is_recurring: false,
  recurrence_period: "",
  supplier: "",
  cost_center: "",
  reference_code: "",
  installments: "À vista",
  due_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "",
  payment_account: "",
  is_paid: false,
  is_scheduled: false,
  notes: "",
};

/* ─── Helpers ─── */
function parseLocalDate(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

function formatDateBR(dateStr: string): string {
  try {
    return format(parseLocalDate(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

function getFileIcon(name: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-400" />;
  if (ext === "csv") return <FileText className="h-4 w-4 text-green-500" />;
  return <Image className="h-4 w-4 text-blue-400" />;
}

/* ─── Autocomplete Field ─── */
function AutocompleteField({
  value,
  onChange,
  suggestions,
  placeholder,
  minChars = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  minChars?: number;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    if (value.length < minChars) return [];
    const q = value.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [value, suggestions, minChars]);

  return (
    <Popover open={open && filtered.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(e.target.value.length >= minChars);
          }}
          onFocus={() => { if (value.length >= minChars) setOpen(true); }}
          placeholder={placeholder}
        />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            <CommandEmpty>Nenhuma sugestão</CommandEmpty>
            <CommandGroup>
              {filtered.map((s) => (
                <CommandItem key={s} onSelect={() => { onChange(s); setOpen(false); }}>
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ─── Date Picker Field ─── */
function DatePickerField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const selected = value ? parseLocalDate(value) : undefined;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatDateBR(value) : "Selecione"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => { if (d) onChange(format(d, "yyyy-MM-dd")); }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── File Attachment Section ─── */
function AttachmentSection({
  attachmentUrl,
  attachmentName,
  onFileSelect,
  onRemove,
  uploading,
}: {
  attachmentUrl: string | null;
  attachmentName: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (attachmentUrl) window.open(attachmentUrl, "_blank");
  };

  const handleShare = async () => {
    if (!attachmentUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: attachmentName || "Anexo", url: attachmentUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(attachmentUrl);
      toast.success("Link copiado para a área de transferência");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos (NF / Comprovante)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
            e.target.value = "";
          }}
        />

        {attachmentUrl && attachmentName ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            {getFileIcon(attachmentName)}
            <span className="text-sm truncate flex-1">{attachmentName}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} title="Compartilhar">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onRemove} title="Remover">
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Paperclip className="mr-2 h-4 w-4" /> Anexar NF ou Comprovante (PDF, JPG, PNG, BMP, CSV)</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function ExpensesPage() {
  const tenantId = useTenantId();
  const TENANT_ID = tenantId || "";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Suggestions
  const descriptionSuggestions = useMemo(() => {
    const fromExpenses = expenses.map((e) => e.description);
    const fromTemplates = DEFAULT_COST_LINES.map((t) => t.subcategory);
    return Array.from(new Set([...fromExpenses, ...fromTemplates])).sort();
  }, [expenses]);

  const supplierSuggestions = useMemo(() => {
    const fromExpenses = expenses.map((e) => e.supplier).filter(Boolean) as string[];
    const fromTemplates = DEFAULT_COST_LINES.map((t) => t.supplier).filter(Boolean);
    return Array.from(new Set([...fromExpenses, ...fromTemplates])).sort();
  }, [expenses]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asaas_expenses")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("date", { ascending: false });
    if (error) { toast.error("Erro ao carregar despesas"); console.error(error); }
    setExpenses((data || []) as Expense[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...defaultForm, date: format(new Date(), "yyyy-MM-dd"), due_date: format(new Date(), "yyyy-MM-dd") });
    setAttachmentUrl(null);
    setAttachmentName(null);
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description,
      value: String(e.value),
      date: e.date,
      category: e.category || "Outros",
      is_recurring: e.is_recurring,
      recurrence_period: e.recurrence_period || "",
      supplier: e.supplier || "",
      cost_center: e.cost_center || "",
      reference_code: e.reference_code || "",
      installments: e.installments || "À vista",
      due_date: e.due_date || e.date,
      payment_method: e.payment_method || "",
      payment_account: e.payment_account || "",
      is_paid: e.is_paid ?? false,
      is_scheduled: e.is_scheduled ?? false,
      notes: e.notes || "",
    });
    setAttachmentUrl(e.attachment_url || null);
    setAttachmentName(e.attachment_name || null);
    setDialogOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${TENANT_ID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("expense-attachments").upload(path, file);
    if (error) {
      toast.error("Erro ao enviar arquivo");
      console.error(error);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("expense-attachments").getPublicUrl(path);
    setAttachmentUrl(urlData.publicUrl);
    setAttachmentName(file.name);
    setUploading(false);
    toast.success("Arquivo anexado com sucesso");
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentName(null);
  };

  const handleSave = async () => {
    if (!form.description || !form.value) { toast.error("Preencha descrição e valor"); return; }
    setSaving(true);
    const payload = {
      tenant_id: TENANT_ID,
      description: form.description,
      value: parseFloat(form.value),
      date: form.date,
      category: form.category,
      is_recurring: form.is_recurring,
      recurrence_period: form.is_recurring ? form.recurrence_period : null,
      supplier: form.supplier || null,
      cost_center: form.cost_center || null,
      reference_code: form.reference_code || null,
      installments: form.installments,
      due_date: form.due_date || form.date,
      payment_method: form.payment_method || null,
      payment_account: form.payment_account || null,
      is_paid: form.is_paid,
      is_scheduled: form.is_scheduled,
      notes: form.notes || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    };

    if (editing) {
      const { error } = await supabase.from("asaas_expenses").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Despesa atualizada");
    } else {
      const { error } = await supabase.from("asaas_expenses").insert(payload);
      if (error) toast.error("Erro ao criar"); else toast.success("Despesa criada");
    }
    setSaving(false);
    setDialogOpen(false);
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("asaas_expenses").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Despesa excluída"); loadExpenses(); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.value), 0);

  // ── Ledger table styles (Pzaafi: no radius, no shadow, strict grid) ──
  const ledgerTh: React.CSSProperties = {
    padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: 2,
    textTransform: "uppercase", textAlign: "left", fontFamily: "Inter, system-ui, sans-serif",
    borderBottom: "none", whiteSpace: "nowrap",
  };
  const ledgerTd: React.CSSProperties = {
    padding: "10px 12px", fontSize: 12, color: "#333",
    fontFamily: "Inter, system-ui, sans-serif", whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  // Detect AI-generated expenses (have attachment_url containing "expense-attachments" and no reference_code starting with manual prefix)
  const isAIGenerated = (e: Expense) => !!e.attachment_url && e.attachment_url.includes("expense-attachments") && !e.reference_code?.startsWith("MAN-");

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Header bar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 0", borderBottom: "2px solid #000", marginBottom: 0,
      }}>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 900, letterSpacing: -0.5,
            color: "#000", margin: 0, textTransform: "uppercase",
          }}>Livro de Despesas</h1>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: "#999", margin: "4px 0 0", textTransform: "uppercase" }}>
            Registro Contábil — {expenses.length} lançamentos
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#999", margin: 0, textTransform: "uppercase" }}>Total Acumulado</p>
            <p style={{
              fontSize: 22, fontWeight: 900, color: "#000", margin: 0,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}>R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        <PermissionGate module="despesas" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                onClick={openNew}
                style={{
                  background: "#000", color: "#FFF", border: "none", borderRadius: 0,
                  padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  textTransform: "uppercase", cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif",
                }}
              >+ NOVA DESPESA</button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>

            {/* Informações do lançamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informações do lançamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <AutocompleteField
                      value={form.supplier}
                      onChange={(v) => setForm({ ...form, supplier: v })}
                      suggestions={supplierSuggestions}
                      placeholder="Nome do fornecedor"
                      minChars={4}
                    />
                  </div>
                  <DatePickerField
                    label="Data de competência *"
                    value={form.date}
                    onChange={(v) => setForm({ ...form, date: v })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Descrição *</Label>
                    <AutocompleteField
                      value={form.description}
                      onChange={(v) => setForm({ ...form, description: v })}
                      suggestions={descriptionSuggestions}
                      placeholder="Ex: Servidor AWS"
                      minChars={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Centro de custo</Label>
                    <Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} placeholder="Ex: Operações" />
                  </div>
                  <div className="space-y-2">
                    <Label>Código de referência</Label>
                    <Input value={form.reference_code} onChange={(e) => setForm({ ...form, reference_code: e.target.value })} placeholder="Ex: NF-001" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Repetir lançamento + Condição de pagamento */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Label>Repetir lançamento?</Label>
                  <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                </div>
                {form.is_recurring && (
                  <div className="space-y-2">
                    <Label>Período de recorrência</Label>
                    <Select value={form.recurrence_period} onValueChange={(v) => setForm({ ...form, recurrence_period: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <h3 className="font-medium text-sm pt-2">Condição de pagamento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Parcelamento *</Label>
                    <Select value={form.installments} onValueChange={(v) => setForm({ ...form, installments: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePickerField
                    label="Vencimento *"
                    value={form.due_date}
                    onChange={(v) => setForm({ ...form, due_date: v })}
                  />
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta de pagamento</Label>
                    <Input value={form.payment_account} onChange={(e) => setForm({ ...form, payment_account: e.target.value })} placeholder="Ex: Santander CC" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: !!v })} />
                    <Label className="cursor-pointer">Pago</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.is_scheduled} onCheckedChange={(v) => setForm({ ...form, is_scheduled: !!v })} />
                    <Label className="cursor-pointer">Agendado</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anexos */}
            <AttachmentSection
              attachmentUrl={attachmentUrl}
              attachmentName={attachmentName}
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveAttachment}
              uploading={uploading}
            />

            {/* Observações */}
            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes">Observações</TabsTrigger>
              </TabsList>
              <TabsContent value="notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Descreva observações relevantes sobre esse lançamento financeiro"
                  rows={3}
                />
              </TabsContent>
            </Tabs>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogContent>
          </Dialog>
        </PermissionGate>
        </div>
      </div>

      {/* ── Ledger Data Table ── */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #000", borderRadius: 0,
        boxShadow: "none", overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ margin: "0 auto", color: "#999" }} />
            <p style={{ fontSize: 10, letterSpacing: 2, color: "#999", marginTop: 8, textTransform: "uppercase" }}>Carregando registros...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#999", fontFamily: "monospace" }}>NENHUM LANÇAMENTO REGISTRADO</p>
            <p style={{ fontSize: 10, color: "#CCC", marginTop: 4 }}>Envie uma foto de recibo via WhatsApp ou clique em "+ NOVA DESPESA"</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontFamily: "Inter, system-ui, sans-serif", fontSize: 12,
            }}>
              <thead>
                <tr style={{ background: "#000", color: "#FFF" }}>
                  <th style={ledgerTh}>DATA</th>
                  <th style={ledgerTh}>FORNECEDOR</th>
                  <th style={ledgerTh}>DESCRIÇÃO</th>
                  <th style={ledgerTh}>CATEGORIA</th>
                  <th style={{ ...ledgerTh, textAlign: "right" }}>VALOR</th>
                  <th style={{ ...ledgerTh, textAlign: "center" }}>STATUS</th>
                  <th style={{ ...ledgerTh, textAlign: "center" }}>COMPROVANTE</th>
                  <th style={{ ...ledgerTh, textAlign: "center" }}>ORIGEM</th>
                  <th style={{ ...ledgerTh, width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, idx) => (
                  <tr
                    key={e.id}
                    style={{
                      background: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                      borderBottom: "1px solid #E8E5DF",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = "#F5F5F0")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA")}
                  >
                    <td style={ledgerTd}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#000" }}>
                        {formatDateBR(e.date)}
                      </span>
                    </td>
                    <td style={ledgerTd}>
                      <span style={{ fontWeight: 600, color: "#000" }}>{e.supplier || "—"}</span>
                    </td>
                    <td style={{ ...ledgerTd, color: "#444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.description}
                    </td>
                    <td style={ledgerTd}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                        color: "#666", padding: "2px 6px", border: "1px solid #DDD", background: "#FAFAFA",
                        display: "inline-block",
                      }}>{e.category || "—"}</span>
                    </td>
                    <td style={{ ...ledgerTd, textAlign: "right" }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontSize: 12, fontWeight: 700, color: "#000",
                      }}>
                        R$ {Number(e.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ ...ledgerTd, textAlign: "center" }}>
                      {e.is_paid ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#000", textTransform: "uppercase" }}>PAGO</span>
                      ) : e.is_scheduled ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#999", textTransform: "uppercase" }}>AGENDADO</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#CCC", textTransform: "uppercase" }}>PENDENTE</span>
                      )}
                    </td>
                    <td style={{ ...ledgerTd, textAlign: "center" }}>
                      {e.attachment_url ? (
                        <a
                          href={e.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 10, fontWeight: 600, color: "#000",
                            textDecoration: "underline", textUnderlineOffset: 2,
                            fontFamily: "monospace", letterSpacing: 0.5,
                          }}
                        >VER RECIBO</a>
                      ) : (
                        <span style={{ fontSize: 10, color: "#DDD" }}>—</span>
                      )}
                    </td>
                    <td style={{ ...ledgerTd, textAlign: "center" }}>
                      {isAIGenerated(e) ? (
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: 1,
                          color: "#FFF", background: "#000", padding: "2px 5px",
                          fontFamily: "monospace", display: "inline-block",
                        }}>AI</span>
                      ) : (
                        <span style={{ fontSize: 8, color: "#CCC", fontFamily: "monospace" }}>MANUAL</span>
                      )}
                    </td>
                    <td style={{ ...ledgerTd, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        <PermissionGate module="despesas" action="edit">
                          <button
                            onClick={() => openEdit(e)}
                            style={{
                              background: "none", border: "1px solid #DDD", borderRadius: 0,
                              padding: "4px 8px", cursor: "pointer", fontSize: 10, color: "#000",
                              fontFamily: "monospace",
                            }}
                            onMouseEnter={(ev) => (ev.currentTarget.style.borderColor = "#000")}
                            onMouseLeave={(ev) => (ev.currentTarget.style.borderColor = "#DDD")}
                          >EDIT</button>
                        </PermissionGate>
                        <PermissionGate module="despesas" action="delete">
                          <button
                            onClick={() => handleDelete(e.id)}
                            style={{
                              background: "none", border: "1px solid #DDD", borderRadius: 0,
                              padding: "4px 8px", cursor: "pointer", fontSize: 10, color: "#999",
                              fontFamily: "monospace",
                            }}
                            onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = "#000"; ev.currentTarget.style.color = "#000"; }}
                            onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "#DDD"; ev.currentTarget.style.color = "#999"; }}
                          >DEL</button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer total row */}
              <tfoot>
                <tr style={{ background: "#000", color: "#FFF" }}>
                  <td colSpan={4} style={{ ...ledgerTh, textAlign: "right", fontWeight: 700 }}>TOTAL</td>
                  <td style={{ ...ledgerTh, textAlign: "right" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, fontWeight: 900 }}>
                      R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td colSpan={4} style={ledgerTh} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
