import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { Building2, Loader2, Save, CheckCircle2 } from "lucide-react";

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function TenantManagementCard() {
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpf_cnpj: "",
    email: "",
    phone: "",
    slug: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    supabase
      .from("tenants")
      .select("name, slug, cpf_cnpj, email, phone")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name || "",
            cpf_cnpj: data.cpf_cnpj ? formatCpfCnpj(data.cpf_cnpj) : "",
            email: data.email || "",
            phone: (data as any).phone || "",
            slug: data.slug || "",
          });
        }
        setLoading(false);
      });
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    if (!form.name.trim()) { toast.error("Nome da empresa é obrigatório"); return; }

    setSaving(true);
    const cpfDigits = form.cpf_cnpj ? form.cpf_cnpj.replace(/\D/g, "") : null;

    const { error } = await supabase.from("tenants").update({
      name: form.name.trim(),
      cpf_cnpj: cpfDigits || null,
      email: form.email.trim().toLowerCase() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", tenantId);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados da empresa atualizados!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Dados da Empresa
        </CardTitle>
        <CardDescription>Informações da empresa titular da licença.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Razão social ou nome fantasia"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug (identificador)</Label>
            <Input value={form.slug} disabled className="opacity-60" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CPF / CNPJ</Label>
            <Input
              value={form.cpf_cnpj}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                setForm(f => ({ ...f, cpf_cnpj: digits.length > 0 ? formatCpfCnpj(digits) : "" }));
              }}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail principal</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contato@empresa.com.br"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Dados
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
