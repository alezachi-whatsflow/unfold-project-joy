import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, DollarSign, CalendarIcon, Paperclip, Download, Share2, FileText, Image, X } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DEFAULT_COST_LINES } from "@/lib/costLineTemplates";
import { cn } from "@/lib/utils";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CATEGORIES = ["Pessoal", "Software", "Marketing", "Infraestrutura", "Impostos", "Comissões", "Despesas Comerciais", "Despesas Financeiras", "Custos de Prestação do Serviço (CSP)", "Salários / Pessoal", "General & Administrative", "Outros"];
const INSTALLMENT_OPTIONS = ["À vista", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x", "11x", "12x"];
const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Transferência", "Dinheiro", "Outro"];
const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.bmp,.gif,.webp,.tiff";

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
              <><Paperclip className="mr-2 h-4 w-4" /> Anexar NF ou Comprovante (PDF, JPG, PNG, BMP)</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function ExpensesPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as despesas da empresa</p>
        </div>
        <PermissionGate module="despesas" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>
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
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-destructive" />
            Total: R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma despesa cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Anexo</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{formatDateBR(e.date)}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.category || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.supplier || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">R$ {Number(e.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center text-xs">
                      {e.is_paid ? <span className="text-emerald-500">Pago</span> : e.is_scheduled ? <span className="text-yellow-500">Agendado</span> : <span className="text-muted-foreground">Pendente</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {e.attachment_url ? (
                        <Button variant="ghost" size="icon" onClick={() => window.open(e.attachment_url!, "_blank")} title={e.attachment_name || "Anexo"}>
                          {getFileIcon(e.attachment_name || "file")}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
