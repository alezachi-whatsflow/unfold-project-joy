import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { KeyRound, Pencil, Loader2, Save, RefreshCw } from "lucide-react";
import { calculateMRR } from "@/hooks/useLicense";

interface LicenseRow {
  id: string;
  tenant_id: string;
  plan: string;
  status: string;
  base_devices_web: number;
  base_devices_meta: number;
  base_attendants: number;
  extra_devices_web: number;
  extra_devices_meta: number;
  extra_attendants: number;
  has_ai_module: boolean;
  ai_agents_limit: number;
  facilite_plan: string;
  facilite_monthly_hours: number;
  has_implantacao_starter: boolean;
  monthly_value: number;
  billing_cycle: string;
  expires_at: string | null;
  tenant_name?: string;
}

export default function SuperAdminLicenses() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLicense, setEditLicense] = useState<LicenseRow | null>(null);
  const [form, setForm] = useState<Partial<LicenseRow>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: lics } = await supabase.from("licenses").select("*");
    const { data: tenants } = await supabase.from("tenants").select("id, name");

    const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
    const enriched = (lics || []).map((l: any) => ({
      ...l,
      tenant_name: tenantMap.get(l.tenant_id) || "Desconhecido",
    }));

    setLicenses(enriched as LicenseRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (lic: LicenseRow) => {
    setEditLicense(lic);
    setForm({ ...lic });
  };

  const mrrPreview = form.plan ? calculateMRR(form as any) : 0;

  const handleSave = async () => {
    if (!editLicense) return;
    setSaving(true);

    const updates: any = {
      plan: form.plan,
      extra_devices_web: form.extra_devices_web || 0,
      extra_devices_meta: form.extra_devices_meta || 0,
      extra_attendants: form.extra_attendants || 0,
      has_ai_module: form.has_ai_module || false,
      ai_agents_limit: form.has_ai_module ? (form.ai_agents_limit || 5) : 0,
      facilite_plan: form.facilite_plan || "none",
      facilite_monthly_hours:
        form.facilite_plan === "basico" ? 8 :
        form.facilite_plan === "intermediario" ? 20 :
        form.facilite_plan === "avancado" ? 40 : 0,
      has_implantacao_starter: form.has_implantacao_starter || false,
      monthly_value: mrrPreview,
      base_attendants: form.plan === "profissional" ? 3 : 1,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("licenses").update(updates).eq("id", editLicense.id);

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      // Log history
      await supabase.from("license_history").insert({
        tenant_id: editLicense.tenant_id,
        previous_plan: editLicense.plan,
        new_plan: form.plan,
        changes: {
          extra_devices_web: form.extra_devices_web,
          extra_devices_meta: form.extra_devices_meta,
          extra_attendants: form.extra_attendants,
          has_ai_module: form.has_ai_module,
          facilite_plan: form.facilite_plan,
          monthly_value: mrrPreview,
        },
      } as any);

      // Update tenant plan
      await supabase.from("tenants").update({ plan: form.plan } as any).eq("id", editLicense.tenant_id);

      toast.success("Licença atualizada!");
    }

    setSaving(false);
    setEditLicense(null);
    load();
  };

  const renewLicense = async (lic: LicenseRow, months: number) => {
    const current = lic.expires_at ? new Date(lic.expires_at) : new Date();
    current.setMonth(current.getMonth() + months);
    
    await supabase.from("licenses").update({
      expires_at: current.toISOString(),
      updated_at: new Date().toISOString(),
    } as any).eq("id", lic.id);

    await supabase.from("tenants").update({
      valid_until: current.toISOString(),
    } as any).eq("id", lic.tenant_id);

    await supabase.from("license_history").insert({
      tenant_id: lic.tenant_id,
      previous_plan: lic.plan,
      new_plan: lic.plan,
      changes: { action: "renewal", months, new_expiry: current.toISOString() },
      reason: `Renovação de ${months} meses`,
    } as any);

    toast.success(`Licença renovada por ${months} meses!`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-6 w-6" /> Licenças
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie planos, add-ons e validade de cada tenant</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{licenses.filter(l => l.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">
              R$ {licenses.reduce((s, l) => s + (Number(l.monthly_value) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">MRR Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{licenses.filter(l => l.has_ai_module).length}</p>
            <p className="text-xs text-muted-foreground">Com Módulo I.A.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{licenses.filter(l => l.facilite_plan !== "none").length}</p>
            <p className="text-xs text-muted-foreground">Com Facilite</p>
          </CardContent>
        </Card>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tenant</TableHead>
                  <TableHead className="text-xs">Plano</TableHead>
                  <TableHead className="text-xs">MRR</TableHead>
                  <TableHead className="text-xs">Dispositivos</TableHead>
                  <TableHead className="text-xs">Add-ons</TableHead>
                  <TableHead className="text-xs">Validade</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((lic) => (
                  <TableRow key={lic.id}>
                    <TableCell className="text-sm font-medium">{lic.tenant_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {lic.plan === "profissional" ? "Profissional" : "Solo Pro"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      R$ {(Number(lic.monthly_value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      Web: {lic.base_devices_web + lic.extra_devices_web} · Meta: {lic.base_devices_meta + lic.extra_devices_meta}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {lic.has_ai_module && <Badge variant="secondary" className="text-[9px]">I.A.</Badge>}
                        {lic.facilite_plan !== "none" && <Badge variant="secondary" className="text-[9px]">Facilite</Badge>}
                        {lic.extra_attendants > 0 && <Badge variant="secondary" className="text-[9px]">+{lic.extra_attendants} atend.</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lic)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renewLicense(lic, 12)} title="Renovar 12 meses">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit License Dialog */}
      <Dialog open={!!editLicense} onOpenChange={(v) => !v && setEditLicense(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Licença — {editLicense?.tenant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Plano Base</Label>
              <Select value={form.plan || "solo_pro"} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo_pro">Solo Pro (R$ 259/mês)</SelectItem>
                  <SelectItem value="profissional">Profissional (R$ 359/mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add-ons</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Extra Web</Label>
                <Input type="number" min={0} value={form.extra_devices_web || 0}
                  onChange={(e) => setForm({ ...form, extra_devices_web: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Extra Meta</Label>
                <Input type="number" min={0} value={form.extra_devices_meta || 0}
                  onChange={(e) => setForm({ ...form, extra_devices_meta: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Extra Atendentes</Label>
                <Input type="number" min={0} value={form.extra_attendants || 0}
                  onChange={(e) => setForm({ ...form, extra_attendants: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Módulo I.A.</Label>
                <p className="text-[10px] text-muted-foreground">R$ 350/mês (até 5 agentes)</p>
              </div>
              <Switch checked={form.has_ai_module || false} onCheckedChange={(v) => setForm({ ...form, has_ai_module: v })} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Facilite Whatsflow</Label>
              <Select value={form.facilite_plan || "none"} onValueChange={(v) => setForm({ ...form, facilite_plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="basico">Básico (R$ 250/mês — 8h)</SelectItem>
                  <SelectItem value="intermediario">Intermediário (R$ 700/mês — 20h)</SelectItem>
                  <SelectItem value="avancado">Avançado (R$ 1.500/mês — 40h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Implantação Starter</Label>
                <p className="text-[10px] text-muted-foreground">R$ 2.000 (único)</p>
              </div>
              <Switch checked={form.has_implantacao_starter || false} onCheckedChange={(v) => setForm({ ...form, has_implantacao_starter: v })} />
            </div>

            <Separator />

            {/* MRR Preview */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">MRR Calculado</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {mrrPreview.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Valor mensal recorrente</p>
            </div>

            <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Licença
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
