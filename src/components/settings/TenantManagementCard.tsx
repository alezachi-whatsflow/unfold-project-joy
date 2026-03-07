import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle2, Search, Star } from "lucide-react";

const DEFAULT_TENANT_KEY = "whatsflow_default_tenant_id";

function getDefaultTenantId(): string | null {
  return localStorage.getItem(DEFAULT_TENANT_KEY);
}

function setDefaultTenantId(id: string) {
  localStorage.setItem(DEFAULT_TENANT_KEY, id);
  window.dispatchEvent(new Event("tenant-changed"));
}

interface Tenant {
  id: string;
  name: string;
  document: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  created_at: string | null;
}

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function validateCpfCnpj(value: string): { valid: boolean; type: "CPF" | "CNPJ" | null } {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return { valid: true, type: "CPF" };
  if (digits.length === 14) return { valid: true, type: "CNPJ" };
  return { valid: false, type: null };
}

export function TenantManagementCard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cpf_cnpj: "", email: "", document: "" });
  const [defaultId, setDefaultId] = useState<string | null>(getDefaultTenantId());

  const handleSetDefault = (tenant: Tenant) => {
    setDefaultTenantId(tenant.id);
    setDefaultId(tenant.id);
    toast.success(`"${tenant.name}" definida como empresa padrão`);
  };

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar empresas");
      console.error(error);
    }
    setTenants((data || []) as Tenant[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", cpf_cnpj: "", email: "", document: "" });
    setValidationResult(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name,
      cpf_cnpj: t.cpf_cnpj || "",
      email: t.email || "",
      document: t.document || "",
    });
    setValidationResult(null);
    setDialogOpen(true);
  };

  const validateLicense = async (): Promise<boolean> => {
    const { cpf_cnpj, email } = form;
    
    if (!cpf_cnpj && !email) {
      setValidationResult("Informe pelo menos CPF/CNPJ ou e-mail para validação.");
      return false;
    }

    if (cpf_cnpj) {
      const { valid, type } = validateCpfCnpj(cpf_cnpj);
      if (!valid) {
        setValidationResult("CPF/CNPJ inválido. CPF deve ter 11 dígitos, CNPJ deve ter 14.");
        return false;
      }
    }

    // Check for duplicates
    if (email) {
      const { data: emailMatches } = await supabase
        .from("tenants")
        .select("id, name, cpf_cnpj, email")
        .eq("email", email.trim().toLowerCase());

      const filtered = (emailMatches || []).filter((t: any) => !editing || t.id !== editing.id);

      if (filtered.length > 0) {
        // Email duplicate found - check CPF/CNPJ as secondary validation
        if (!cpf_cnpj) {
          setValidationResult(
            `E-mail já em uso por "${(filtered[0] as any).name}". Informe CPF/CNPJ para validação secundária.`
          );
          return false;
        }

        const cpfDigits = cpf_cnpj.replace(/\D/g, "");
        const sameDoc = filtered.find((t: any) => t.cpf_cnpj?.replace(/\D/g, "") === cpfDigits);

        if (sameDoc) {
          setValidationResult(
            `Empresa "${(sameDoc as any).name}" já existe com mesmo e-mail e CPF/CNPJ. Não é possível duplicar.`
          );
          return false;
        }

        // Different CPF/CNPJ with same email - allowed
        setValidationResult(null);
        return true;
      }
    }

    // Check CPF/CNPJ uniqueness
    if (cpf_cnpj) {
      const cpfDigits = cpf_cnpj.replace(/\D/g, "");
      const { data: docMatches } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("cpf_cnpj", cpfDigits);

      const filtered = (docMatches || []).filter((t: any) => !editing || t.id !== editing.id);

      if (filtered.length > 0) {
        setValidationResult(
          `CPF/CNPJ já cadastrado para "${(filtered[0] as any).name}".`
        );
        return false;
      }
    }

    setValidationResult(null);
    return true;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    setSaving(true);
    
    const isValid = await validateLicense();
    if (!isValid) {
      setSaving(false);
      return;
    }

    const cpfDigits = form.cpf_cnpj ? form.cpf_cnpj.replace(/\D/g, "") : null;

    const payload = {
      name: form.name.trim(),
      cpf_cnpj: cpfDigits || null,
      email: form.email.trim().toLowerCase() || null,
      document: form.document.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("tenants").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Empresa atualizada");
    } else {
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) toast.error("Erro ao criar: " + error.message); else toast.success("Empresa criada");
    }

    setSaving(false);
    setDialogOpen(false);
    loadTenants();
  };

  const handleDelete = async (id: string) => {
    if (id === "00000000-0000-0000-0000-000000000001") {
      toast.error("Não é possível excluir o tenant padrão");
      return;
    }
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Empresa excluída"); loadTenants(); }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas / Titulares de Licença
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie empresas com validação por CNPJ, CPF e e-mail
            </CardDescription>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova Empresa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Whatsflow Ltda."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input
                    value={form.cpf_cnpj}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                      setForm({ ...form, cpf_cnpj: digits });
                      setValidationResult(null);
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  />
                  {form.cpf_cnpj && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatCpfCnpj(form.cpf_cnpj)} ({validateCpfCnpj(form.cpf_cnpj).type || "Incompleto"})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setValidationResult(null); }}
                    placeholder="empresa@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CNPJ (legado)</Label>
                <Input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="Campo document legado"
                />
              </div>

              {validationResult && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{validationResult}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={validateLicense} className="gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" /> Validar
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : tenants.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Nenhuma empresa cadastrada</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">CPF/CNPJ</TableHead>
                <TableHead className="text-xs">E-mail</TableHead>
                <TableHead className="text-xs">Criado em</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">
                    {t.name}
                    {t.id === defaultId && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Padrão</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {t.cpf_cnpj ? formatCpfCnpj(t.cpf_cnpj) : t.document || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.id !== defaultId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Definir como padrão"
                          onClick={() => handleSetDefault(t)}
                        >
                          <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      {t.id !== defaultId && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
