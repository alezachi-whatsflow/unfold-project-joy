import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license?: any;
  onSaved: () => void;
}

export default function LicenseFormModal({ open, onOpenChange, license, onSaved }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const isEdit = !!license;
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [whitelabels, setWhitelabels] = useState<any[]>([]);

  const [form, setForm] = useState({
    tenant_id: license?.tenant_id || '',
    license_type: license?.license_type || 'individual',
    parent_license_id: license?.parent_license_id || 'none',
    plan: license?.plan || 'profissional',
    status: license?.status || 'active',
    monthly_value: license?.monthly_value || 0,
    base_devices_web: license?.base_devices_web || 1,
    extra_devices_web: license?.extra_devices_web || 0,
    base_devices_meta: license?.base_devices_meta || 1,
    extra_devices_meta: license?.extra_devices_meta || 0,
    base_attendants: license?.base_attendants || 1,
    extra_attendants: license?.extra_attendants || 0,
    has_ai_module: license?.has_ai_module || false,
    ai_agents_limit: license?.ai_agents_limit || 0,
    has_ia_auditor: license?.has_ia_auditor || false,
    has_ia_copiloto: license?.has_ia_copiloto || false,
    has_ia_closer: license?.has_ia_closer || false,
    facilite_plan: license?.facilite_plan || 'none',
    has_implantacao_starter: license?.has_implantacao_starter || false,
    monthly_messages_limit: license?.monthly_messages_limit || 10000,
    storage_limit_gb: license?.storage_limit_gb || 1,
    billing_cycle: license?.billing_cycle || 'monthly',
    internal_notes: license?.internal_notes || '',
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open]);

  async function loadDependencies() {
    const { data: wls } = await supabase.from('licenses').select('id, tenants(name)').eq('license_type', 'whitelabel');
    setWhitelabels(wls || []);
    if (!isEdit) {
      const [{ data: allTenants }, { data: allLics }] = await Promise.all([
        supabase.from('tenants').select('id, name').order('name'),
        supabase.from('licenses').select('tenant_id')
      ]);
      const licensedIds = new Set((allLics || []).map(l => l.tenant_id));
      setTenants((allTenants || []).filter(t => !licensedIds.has(t.id)));
    }
  }

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const mrrPreview = useMemo(() => {
    let base = form.plan === 'profissional' ? 359 : 259;
    const ew = form.extra_devices_web;
    let webPrice = 0;
    if (ew >= 1 && ew <= 5) webPrice = ew * 150;
    else if (ew >= 6 && ew <= 20) webPrice = ew * 125;
    else if (ew > 20) webPrice = ew * 100;

    const em = form.extra_devices_meta;
    let metaPrice = 0;
    if (em >= 1 && em <= 5) metaPrice = em * 100;
    else if (em >= 6 && em <= 20) metaPrice = em * 80;
    else if (em > 20) metaPrice = em * 60;

    const ea = form.extra_attendants;
    let attPrice = 0;
    if (ea >= 1 && ea <= 5) attPrice = ea * 80;
    else if (ea >= 6 && ea <= 10) attPrice = ea * 75;
    else if (ea >= 11 && ea <= 20) attPrice = ea * 70;
    else if (ea > 20) attPrice = ea * 60;

    let aiPrice = form.has_ai_module ? 350 : 0;
    if (form.has_ia_auditor) aiPrice += 99;
    if (form.has_ia_copiloto) aiPrice += 149;
    if (form.has_ia_closer) aiPrice += 199;
    let facPrice = 0;
    if (form.facilite_plan === 'basico') facPrice = 250;
    else if (form.facilite_plan === 'intermediario') facPrice = 700;
    else if (form.facilite_plan === 'avancado') facPrice = 1500;

    return { base, addons: webPrice + metaPrice + attPrice + aiPrice + facPrice, total: base + webPrice + metaPrice + attPrice + aiPrice + facPrice };
  }, [form]);

  async function handleSave() {
    if (!isEdit && !form.tenant_id) {
      toast({ title: 'Selecione um tenant para a licença', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload: any = { ...form, monthly_value: mrrPreview.total };
    if (payload.parent_license_id === 'none') payload.parent_license_id = null;

    if (isEdit) {
      await supabase.from('licenses').update(payload).eq('id', license.id);
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'license_edit', license_id: license.id,
      });
      toast({ title: 'Licença atualizada' });
    } else {
      const { data, error } = await supabase.from('licenses').insert(payload).select().single();
      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
      } else {
        await supabase.from('nexus_audit_logs').insert({
          actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
          action: 'license_create', license_id: data.id,
        });
        toast({ title: 'Licença criada com sucesso!' });
      }
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Licença' : 'Nova Licença'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identificação and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border">
            {!isEdit && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Tenant / Empresa</Label>
                <Select value={form.tenant_id} onValueChange={(v) => set('tenant_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um tenant sem licença" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                    {tenants.length === 0 && <SelectItem value="none" disabled>Nenhum Tenant disponível</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Licença</Label>
              <Select value={form.license_type} onValueChange={(v) => set('license_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual (Cliente Final)</SelectItem>
                  <SelectItem value="whitelabel">WhiteLabel (Parceiro)</SelectItem>
                  <SelectItem value="internal">Interno (Edtech/Laboratório)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.license_type === 'individual' && (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Pertence ao WhiteLabel? (Opcional)</Label>
                <Select value={form.parent_license_id} onValueChange={(v) => set('parent_license_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Direto Whatsflow (Nenhum)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Contrato Direto (Whatsflow)</SelectItem>
                    {whitelabels.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.tenants?.name || 'WhiteLabel Sem Nome'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {/* Plan */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Plano Base</Label>
            <RadioGroup value={form.plan} onValueChange={(v) => set('plan', v)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solo_pro" id="solo_pro" />
                <Label htmlFor="solo_pro" className="text-sm">Solo Pro — R$ 259/mês</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="profissional" id="profissional" />
                <Label htmlFor="profissional" className="text-sm">Profissional — R$ 359/mês</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Recursos Contratados</Label>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Atendentes Base" value={form.base_attendants} onChange={(v) => set('base_attendants', v)} />
              <NumField label="Extra Atendentes" value={form.extra_attendants} onChange={(v) => set('extra_attendants', v)} />
              <NumField label="Disp. Web Extra" value={form.extra_devices_web} onChange={(v) => set('extra_devices_web', v)} />
              <NumField label="Disp. Meta Extra" value={form.extra_devices_meta} onChange={(v) => set('extra_devices_meta', v)} />
              <NumField label="Msgs/mês" value={form.monthly_messages_limit} onChange={(v) => set('monthly_messages_limit', v)} />
              <NumField label="Storage (GB)" value={form.storage_limit_gb} onChange={(v) => set('storage_limit_gb', v)} />
            </div>
          </div>

          {/* Add-ons */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Add-ons</Label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 rounded border">
                <div>
                  <p className="text-sm font-medium">Auditor de Qualidade (+R$ 99/mês)</p>
                  <p className="text-xs text-muted-foreground">Avalia atendimentos e recomenda melhorias.</p>
                </div>
                <Switch checked={form.has_ia_auditor} onCheckedChange={(v) => set('has_ia_auditor', v)} />
              </div>
              <div className="flex items-center justify-between p-2 rounded border">
                <div>
                  <p className="text-sm font-medium">Copiloto do Consultor (+R$ 149/mês)</p>
                  <p className="text-xs text-muted-foreground">Sugestões de respostas e contorno de objeções.</p>
                </div>
                <Switch checked={form.has_ia_copiloto} onCheckedChange={(v) => set('has_ia_copiloto', v)} />
              </div>
              <div className="flex items-center justify-between p-2 rounded border">
                <div>
                  <p className="text-sm font-medium">Closer Autônomo (+R$ 199/mês)</p>
                  <p className="text-xs text-muted-foreground">Automatiza primeiro contato e qualificação.</p>
                </div>
                <Switch checked={form.has_ia_closer} onCheckedChange={(v) => set('has_ia_closer', v)} />
              </div>
            </div>
            {form.has_ai_module && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Legal I.A. Module (+R$ 350/mês)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Label className="text-xs">Agentes:</Label>
                    <Input type="number" className="w-20 h-7 text-xs" value={form.ai_agents_limit} onChange={(e) => set('ai_agents_limit', Number(e.target.value))} />
                  </div>
                </div>
                <Switch checked={form.has_ai_module} onCheckedChange={(v) => set('has_ai_module', v)} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm">Implantação Starter (+R$ 2.000 único)</p>
              <Switch checked={form.has_implantacao_starter} onCheckedChange={(v) => set('has_implantacao_starter', v)} />
            </div>
          </div>

          {/* Facilite */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Facilite Whatsflow</Label>
            <RadioGroup value={form.facilite_plan} onValueChange={(v) => set('facilite_plan', v)} className="flex flex-wrap gap-3">
              {[
                { v: 'none', l: 'Nenhum' },
                { v: 'basico', l: 'Básico R$250' },
                { v: 'intermediario', l: 'Intermediário R$700' },
                { v: 'avancado', l: 'Avançado R$1.500' },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`fac_${o.v}`} />
                  <Label htmlFor={`fac_${o.v}`} className="text-sm">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Billing */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Cobrança</Label>
            <Select value={form.billing_cycle} onValueChange={(v) => set('billing_cycle', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Observação Interna</Label>
            <Textarea value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} placeholder="Visível apenas no Nexus..." className="min-h-[60px]" />
          </div>

          {/* MRR Preview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano base:</span>
                <span className="font-medium">R$ {mrrPreview.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-ons:</span>
                <span className="font-medium">R$ {mrrPreview.addons.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border mt-2 pt-2">
                <span>MRR Total:</span>
                <span className="text-primary">R$ {mrrPreview.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Salvar Licença
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" className="h-8 text-sm" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
