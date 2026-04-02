import { fmtDate } from "@/lib/dateUtils";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, Search, MoreVertical, Pencil, Ban, CheckCircle, Eye, Loader2,
  Building2,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  license_key: string;
  valid_until: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  created_at: string;
}

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", cpf_cnpj: "", plan: "solo_pro",
    valid_months: "12", admin_name: "", admin_email: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    setTenants((data || []) as Tenant[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (planFilter !== "all" && t.plan !== planFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", cpf_cnpj: "", plan: "solo_pro", valid_months: "12", admin_name: "", admin_email: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name, email: t.email || "", cpf_cnpj: t.cpf_cnpj || "",
      plan: t.plan || "solo_pro", valid_months: "12", admin_name: "", admin_email: "",
    });
    setDialogOpen(true);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);

    const slug = generateSlug(form.name) + (!editing ? "-" + Date.now().toString(36).slice(-4) : "");
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + parseInt(form.valid_months || "12"));

    if (editing) {
      const { error } = await supabase.from("tenants").update({
        name: form.name.trim(),
        email: form.email || null,
        cpf_cnpj: form.cpf_cnpj?.replace(/\D/g, "") || null,
        plan: form.plan,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editing.id);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Tenant atualizado!");
    } else {
      const licenseKey = "WF-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: tenant, error } = await supabase.from("tenants").insert({
        name: form.name.trim(),
        slug,
        email: form.email || null,
        cpf_cnpj: form.cpf_cnpj?.replace(/\D/g, "") || null,
        plan: form.plan,
        status: "active",
        license_key: licenseKey,
        valid_until: validUntil.toISOString(),
      } as any).select().single();

      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }

      // Create license record
      const basePlan = form.plan === "profissional"
        ? { base_attendants: 3, monthly_value: 359 }
        : { base_attendants: 1, monthly_value: 259 };

      await supabase.from("licenses").insert({
        tenant_id: (tenant as any).id,
        plan: form.plan,
        status: "active",
        ...basePlan,
        expires_at: validUntil.toISOString(),
      } as any);

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "tenant_created",
        resource: "tenants",
        resource_id: (tenant as any).id,
        metadata: { tenant_name: form.name, plan: form.plan },
      } as any);

      toast.success("Tenant criado com sucesso!");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleStatus = async (t: Tenant, newStatus: string) => {
    await supabase.from("tenants").update({ status: newStatus } as any).eq("id", t.id);
    await supabase.from("audit_logs").insert({
      action: newStatus === "active" ? "tenant_reactivated" : "tenant_suspended",
      resource: "tenants",
      resource_id: t.id,
      metadata: { tenant_name: t.name },
    } as any);
    toast.success(`Tenant ${newStatus === "active" ? "reativado" : "suspenso"}`);
    load();
  };

  const planPrice = form.plan === "profissional" ? "R$ 359" : "R$ 259";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground">{tenants.length} empresas cadastradas</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="solo_pro">Solo Pro</SelectItem>
            <SelectItem value="profissional">Profissional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Slug</TableHead>
                  <TableHead className="text-xs">Plano</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Validade</TableHead>
                  <TableHead className="text-xs">License Key</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {t.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.email || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{t.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {t.plan === "profissional" ? "Profissional" : "Solo Pro"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "active" ? "default" : t.status === "suspended" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {t.status === "active" ? "Ativo" : t.status === "suspended" ? "Suspenso" : t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.valid_until ? fmtDate(t.valid_until) : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{t.license_key}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          {t.status === "active" ? (
                            <DropdownMenuItem onClick={() => toggleStatus(t, "suspended")} className="text-destructive">
                              <Ban className="h-3.5 w-3.5 mr-2" /> Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleStatus(t, "active")}>
                              <CheckCircle className="h-3.5 w-3.5 mr-2" /> Reativar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum tenant encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editing ? "Editar Tenant" : "Novo Tenant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome da Empresa *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Plano Base</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo_pro">Solo Pro (R$ 259/mês)</SelectItem>
                    <SelectItem value="profissional">Profissional (R$ 359/mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label className="text-xs">Validade (meses)</Label>
                <Select value={form.valid_months} onValueChange={(v) => setForm({ ...form, valid_months: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* MRR Preview */}
            <div className="border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Preview MRR</p>
              <p className="text-lg font-bold text-foreground">{planPrice}/mês</p>
              <p className="text-[10px] text-muted-foreground">
                {form.plan === "profissional" ? "3 atendentes + 1 Web + 1 Meta" : "1 atendente + 1 Web + 1 Meta"}
              </p>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Salvar Alterações" : "Criar Tenant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
