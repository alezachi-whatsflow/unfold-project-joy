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
import { Loader2, Plus, Trash2, Users, AlertCircle, Info, KeyRound } from 'lucide-react';
import { fetchSalesPeople } from '@/lib/asaasQueries';
import type { SalesPerson } from '@/types/asaas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license?: any;
  onSaved: () => void;
}

function toDateInput(v: string | null | undefined) {
  if (!v) return '';
  return v.slice(0, 10); // yyyy-mm-dd
}

// ── Split helpers ──
interface SplitRecipient {
  id: string;
  salespersonId: string;
  walletId: string;
  splitType: 'PERCENTAGE' | 'FIXED';
  splitValue: string;
}
interface SplitConfig { enabled: boolean; recipients: SplitRecipient[] }

let _nextId = 1;
const newRecipient = (): SplitRecipient => ({
  id: `r-${_nextId++}`, salespersonId: '', walletId: '', splitType: 'PERCENTAGE', splitValue: '',
});
const DEFAULT_SPLIT: SplitConfig = { enabled: false, recipients: [newRecipient()] };

export default function LicenseFormModal({ open, onOpenChange, license, onSaved }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const isEdit = !!license;
  const [saving, setSaving] = useState(false);
  const [directActivateOpen, setDirectActivateOpen] = useState(false);
  const [directPassword, setDirectPassword] = useState('');
  const [activating, setActivating] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [whitelabels, setWhitelabels] = useState<any[]>([]);
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [split, setSplit] = useState<SplitConfig>(() => {
    const saved = license?.split_config;
    return saved ? saved : DEFAULT_SPLIT;
  });
  const [tenantFields, setTenantFields] = useState({ cpf_cnpj: '', phone: '' });
  const [createNewTenant, setCreateNewTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');

  const [form, setForm] = useState({
    tenant_id: license?.tenant_id || '',
    license_type: license?.license_type || 'individual',
    parent_license_id: license?.parent_license_id || 'none',
    plan: license?.plan || 'profissional',
    status: license?.status || 'active',
    monthly_value: license?.monthly_value || 0,
    // Datas
    starts_at: toDateInput(license?.starts_at) || toDateInput(new Date().toISOString()),
    expires_at: toDateInput(license?.expires_at) || '',
    cancelled_at: toDateInput(license?.cancelled_at) || '',
    blocked_at: toDateInput(license?.blocked_at) || '',
    unblocked_at: toDateInput(license?.unblocked_at) || '',
    // Recursos
    base_attendants: license?.base_attendants || 1,
    extra_attendants: license?.extra_attendants || 0,
    base_devices_web: license?.base_devices_web || 1,
    extra_devices_web: license?.extra_devices_web || 0,
    base_devices_meta: license?.base_devices_meta || 1,
    extra_devices_meta: license?.extra_devices_meta || 0,
    monthly_messages_limit: license?.monthly_messages_limit || 10000,
    storage_limit_gb: license?.storage_limit_gb || 1,
    // Add-ons I.A.
    has_ai_module: license?.has_ai_module || false,
    ai_agents_limit: license?.ai_agents_limit || 0,
    has_ia_auditor: license?.has_ia_auditor || false,
    has_ia_copiloto: license?.has_ia_copiloto || false,
    has_ia_closer: license?.has_ia_closer || false,
    // WhiteLabel slug (only for whitelabel type)
    whitelabel_slug: license?.whitelabel_slug || '',
    // Outros
    facilite_plan: license?.facilite_plan || 'none',
    has_implantacao_starter: license?.has_implantacao_starter || false,
    // Cobrança
    billing_cycle: license?.billing_cycle || 'monthly',
    payment_type: license?.payment_type || 'boleto',
    payment_condition: license?.payment_condition || 'mensal',
    checkout_url: license?.checkout_url || '',
    internal_notes: license?.internal_notes || '',
    pricing_config: license?.pricing_config || {
      device_web_tiers: [{min:1,max:5,price:150},{min:6,max:20,price:125},{min:21,max:50,price:100}],
      device_meta_tiers: [{min:1,max:5,price:100},{min:6,max:20,price:70},{min:21,max:50,price:50}],
      attendant_tiers: [{min:1,max:5,price:80},{min:6,max:10,price:75},{min:11,max:20,price:70},{min:21,max:50,price:60}],
      ai_module_price: 350, facilite_basico_price: 250, facilite_intermediario_price: 700,
      facilite_avancado_price: 1500, implantacao_price: 2000,
    },
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
      // Reset form on open with latest license data
      setForm({
        tenant_id: license?.tenant_id || '',
        license_type: license?.license_type || 'individual',
        parent_license_id: license?.parent_license_id || 'none',
        plan: license?.plan || 'profissional',
        status: license?.status || 'active',
        monthly_value: license?.monthly_value || 0,
        starts_at: toDateInput(license?.starts_at) || toDateInput(new Date().toISOString()),
        expires_at: toDateInput(license?.expires_at) || '',
        cancelled_at: toDateInput(license?.cancelled_at) || '',
        blocked_at: toDateInput(license?.blocked_at) || '',
        unblocked_at: toDateInput(license?.unblocked_at) || '',
        base_attendants: license?.base_attendants || 1,
        extra_attendants: license?.extra_attendants || 0,
        base_devices_web: license?.base_devices_web || 1,
        extra_devices_web: license?.extra_devices_web || 0,
        base_devices_meta: license?.base_devices_meta || 1,
        extra_devices_meta: license?.extra_devices_meta || 0,
        monthly_messages_limit: license?.monthly_messages_limit || 10000,
        storage_limit_gb: license?.storage_limit_gb || 1,
        has_ai_module: license?.has_ai_module || false,
        ai_agents_limit: license?.ai_agents_limit || 0,
        has_ia_auditor: license?.has_ia_auditor || false,
        has_ia_copiloto: license?.has_ia_copiloto || false,
        has_ia_closer: license?.has_ia_closer || false,
        whitelabel_slug: license?.whitelabel_slug || '',
        facilite_plan: license?.facilite_plan || 'none',
        has_implantacao_starter: license?.has_implantacao_starter || false,
        billing_cycle: license?.billing_cycle || 'monthly',
        payment_type: license?.payment_type || 'boleto',
        payment_condition: license?.payment_condition || 'mensal',
        checkout_url: license?.checkout_url || '',
        internal_notes: license?.internal_notes || '',
        pricing_config: license?.pricing_config || {
          device_web_price: 125, device_meta_price: 100, attendant_price: 60,
          ai_module_price: 350, facilite_basico_price: 250, facilite_intermediario_price: 700,
          facilite_avancado_price: 1500, implantacao_price: 2000,
        },
      });
    }
  }, [open]);

  async function loadDependencies() {
    const { data: wls } = await supabase
      .from('licenses')
      .select('id, whitelabel_slug, tenants(name)')
      .not('whitelabel_slug', 'is', null)
      .order('created_at', { ascending: false });
    setWhitelabels(wls || []);
    fetchSalesPeople("").then(setSalesPeople).catch(() => {});

    if (isEdit && license?.tenant_id) {
      const { data: t } = await supabase.from('tenants').select('cpf_cnpj, phone').eq('id', license.tenant_id).maybeSingle();
      if (t) setTenantFields({ cpf_cnpj: t.cpf_cnpj || '', phone: t.phone || '' });
      // Load saved split config
      setSplit(license.split_config || DEFAULT_SPLIT);
    } else {
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
    if (form.license_type === 'whitelabel') {
      const base = 170;
      const attPrice = form.extra_attendants * 30;
      const webPrice = form.extra_devices_web * 80;
      const metaPrice = form.extra_devices_meta * 50;
      const aiPrice = form.has_ai_module ? 250 : 0;
      const addons = attPrice + webPrice + metaPrice + aiPrice;
      return { base, addons, total: base + addons };
    }

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

  async function handleDirectActivate() {
    if (!directPassword || directPassword.length < 6) {
      toast({ title: 'Senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }

    // First save the license normally
    setSaving(true);
    setActivating(true);

    try {
      // Resolve email and tenant
      let email = newTenantEmail.trim() || null;
      let tenantName = newTenantName.trim() || 'Cliente';
      let tenantId = form.tenant_id;

      if (!isEdit && createNewTenant) {
        const name = newTenantName.trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({ name, slug, email: email || null })
          .select()
          .single();
        if (tenantError || !newTenant) {
          toast({ title: 'Erro ao criar tenant', description: tenantError?.message, variant: 'destructive' });
          setSaving(false); setActivating(false);
          return;
        }
        tenantId = newTenant.id;
      }

      if (!email && tenantId && !createNewTenant) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('email, name')
          .eq('id', tenantId)
          .single();
        email = tenantData?.email || null;
        tenantName = tenantData?.name || tenantName;
      }

      if (!email) {
        toast({ title: 'E-mail do tenant é obrigatório para ativar', variant: 'destructive' });
        setSaving(false); setActivating(false);
        return;
      }

      // Build license payload
      const payload: Record<string, any> = {
        tenant_id: tenantId,
        license_type: form.license_type,
        plan: form.plan,
        status: 'active',
        monthly_value: form.monthly_value,
        starts_at: form.starts_at || new Date().toISOString().slice(0, 10),
        expires_at: form.expires_at || null,
        base_attendants: form.base_attendants,
        extra_attendants: form.extra_attendants,
        base_devices_web: form.base_devices_web,
        extra_devices_web: form.extra_devices_web,
        base_devices_meta: form.base_devices_meta,
        extra_devices_meta: form.extra_devices_meta,
        has_ai_module: form.has_ai_module,
        ai_agents_limit: form.ai_agents_limit,
        has_ia_auditor: form.has_ia_auditor,
        has_ia_copiloto: form.has_ia_copiloto,
        has_ia_closer: form.has_ia_closer,
        facilite_plan: form.facilite_plan,
        has_implantacao_starter: form.has_implantacao_starter,
        billing_cycle: form.billing_cycle,
        payment_type: form.payment_type,
        payment_condition: form.payment_condition,
        checkout_url: form.checkout_url,
        pricing_config: form.pricing_config,
      };
      if (form.license_type === 'whitelabel') payload.whitelabel_slug = form.whitelabel_slug;
      if (form.parent_license_id) payload.parent_license_id = form.parent_license_id;

      // Insert license
      const { data: licData, error: licError } = await supabase.from('licenses').insert(payload).select().single();
      if (licError) {
        toast({ title: 'Erro ao criar licença', description: licError.message, variant: 'destructive' });
        setSaving(false); setActivating(false);
        return;
      }

      // Direct activate: create user with password, no email
      const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          full_name: tenantName,
          role: form.license_type === 'whitelabel' ? 'wl_admin' : 'admin',
          tenant_id: tenantId,
          license_id: licData.id,
          skip_email: true,
          password: directPassword,
        },
      });

      if (inviteError) {
        toast({ title: 'Licença criada, mas erro ao ativar usuário', description: inviteError.message, variant: 'destructive' });
      } else {
        toast({ title: `Licença ativada! Usuário ${email} pode fazer login com a senha definida.` });
      }

      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'license_create', license_id: licData.id,
      });

      setDirectActivateOpen(false);
      setDirectPassword('');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setActivating(false);
    }
  }

  async function handleSave() {
    if (!isEdit && !createNewTenant && !form.tenant_id) {
      toast({ title: 'Selecione um tenant para a licença', variant: 'destructive' });
      return;
    }
    if (!isEdit && createNewTenant && !newTenantName.trim()) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Create new tenant if needed
    let tenantId = form.tenant_id;
    if (!isEdit && createNewTenant) {
      const name = newTenantName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name, slug, email: newTenantEmail.trim() || null })
        .select('id')
        .single();
      if (tenantError || !newTenant) {
        toast({ title: 'Erro ao criar empresa', description: tenantError?.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      tenantId = newTenant.id;
    }

    // Build payload with only known core columns
    const payload: any = {
      tenant_id: tenantId,
      license_type: form.license_type,
      parent_license_id: form.parent_license_id === 'none' ? null : form.parent_license_id,
      plan: form.plan,
      status: form.status,
      monthly_value: mrrPreview.total,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      base_attendants: form.base_attendants,
      extra_attendants: form.extra_attendants,
      base_devices_web: form.base_devices_web,
      extra_devices_web: form.extra_devices_web,
      base_devices_meta: form.base_devices_meta,
      extra_devices_meta: form.extra_devices_meta,
      monthly_messages_limit: form.monthly_messages_limit,
      storage_limit_gb: form.storage_limit_gb,
      has_ai_module: form.has_ai_module,
      ai_agents_limit: form.ai_agents_limit,
      facilite_plan: form.facilite_plan,
      has_implantacao_starter: form.has_implantacao_starter,
      billing_cycle: form.billing_cycle,
      internal_notes: form.internal_notes || null,
      pricing_config: form.pricing_config || {
        device_web_price: 125,
        device_meta_price: 100,
        attendant_price: 60,
        ai_module_price: 350,
        facilite_basico_price: 250,
        facilite_intermediario_price: 700,
        facilite_avancado_price: 1500,
        implantacao_price: 2000,
      },
    };
    // Add optional columns only if they have values (columns may not exist in DB yet)
    if (form.cancelled_at) payload.cancelled_at = form.cancelled_at;
    if (form.blocked_at) payload.blocked_at = form.blocked_at;
    if (form.unblocked_at) payload.unblocked_at = form.unblocked_at;
    if (form.checkout_url) payload.checkout_url = form.checkout_url;
    if (form.payment_type) payload.payment_type = form.payment_type;
    if (form.payment_condition) payload.payment_condition = form.payment_condition;
    if (form.has_ia_auditor) payload.has_ia_auditor = true;
    if (form.has_ia_copiloto) payload.has_ia_copiloto = true;
    if (form.has_ia_closer) payload.has_ia_closer = true;
    // Only set whitelabel_slug for whitelabel license types
    if (form.whitelabel_slug && form.license_type === 'whitelabel') {
      payload.whitelabel_slug = form.whitelabel_slug;
    }
    if (split.enabled && split.recipients.some(r => r.walletId)) payload.split_config = split;

    const saveTenantId = isEdit ? license.tenant_id : tenantId;
    if (saveTenantId && (tenantFields.cpf_cnpj || tenantFields.phone)) {
      await supabase.from('tenants').update({
        cpf_cnpj: tenantFields.cpf_cnpj || null,
        phone: tenantFields.phone || null,
      }).eq('id', saveTenantId);
    }

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
        const msg = error.message.includes('idx_licenses_whitelabel_slug')
          ? 'Este slug de WhiteLabel ja esta em uso. Escolha outro slug.'
          : error.message;
        toast({ title: 'Erro ao criar', description: msg, variant: 'destructive' });
      } else {
        await supabase.from('nexus_audit_logs').insert({
          actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
          action: 'license_create', license_id: data.id,
        });

        // Send activation email to the tenant email
        let activationEmail = newTenantEmail.trim() || null;
        let tenantName = newTenantName.trim() || 'Cliente';

        // If using existing tenant, fetch their email
        if (!activationEmail && tenantId && !createNewTenant) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('email, name')
            .eq('id', tenantId)
            .single();
          activationEmail = tenantData?.email || null;
          tenantName = tenantData?.name || tenantName;
        }

        if (activationEmail && tenantId) {
          const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('invite-user', {
            body: {
              email: activationEmail,
              full_name: tenantName,
              role: form.license_type === 'whitelabel' ? 'wl_admin' : 'admin',
              tenant_id: tenantId,
              license_id: data.id,
            },
          });
          if (inviteError) {
            console.error('Erro ao enviar e-mail de ativacao:', inviteError);
            toast({ title: 'Licenca criada, mas e-mail de ativacao falhou', description: inviteError.message, variant: 'destructive' });
          } else if (inviteResult?.action_link) {
            // SMTP not configured — copy link
            toast({ title: 'Licenca criada! SMTP nao configurado.', description: 'Link de acesso copiado para a area de transferencia.' });
            try { await navigator.clipboard.writeText(inviteResult.action_link); } catch {}
          } else {
            toast({ title: 'Licenca criada e e-mail de ativacao enviado!' });
          }
        } else {
          toast({ title: 'Licenca criada com sucesso!' });
        }
      }
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Licença' : 'Nova Licença'}</DialogTitle>
          </DialogHeader>

        <div className="space-y-6">

          {/* Identificação */}
          <section className="bg-muted/30 p-4 border border-border space-y-4">
            <SectionTitle>Identificação</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEdit && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Tenant / Empresa</Label>
                    <button
                      type="button"
                      onClick={() => { setCreateNewTenant(!createNewTenant); set('tenant_id', ''); setNewTenantName(''); setNewTenantEmail(''); }}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      {createNewTenant ? 'Selecionar existente' : 'Criar nova empresa'}
                    </button>
                  </div>
                  {createNewTenant ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nome da empresa"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                      />
                      <Input
                        type="email"
                        placeholder="E-mail da empresa"
                        value={newTenantEmail}
                        onChange={(e) => setNewTenantEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <Select value={form.tenant_id} onValueChange={(v) => set('tenant_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um tenant sem licença" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                        {tenants.length === 0 && <SelectItem value="none" disabled>Nenhum Tenant disponível</SelectItem>}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Licença</Label>
                <Select value={form.license_type} onValueChange={(v) => {
                  set('license_type', v);
                  // Clear slug when switching away from whitelabel
                  if (v !== 'whitelabel') set('whitelabel_slug', '');
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual (Cliente Final)</SelectItem>
                    <SelectItem value="whitelabel">WhiteLabel (Parceiro)</SelectItem>
                    <SelectItem value="internal">Interno (Laboratório)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.license_type === 'whitelabel' && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Slug do Partner</Label>
                  <Input
                    placeholder="ex: sendhit, minha-marca"
                    value={form.whitelabel_slug}
                    onChange={(e) => set('whitelabel_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                  />
                  <p className="text-[10px] text-muted-foreground">Identificador unico para URL do portal. Ex: /partners/sendhit</p>
                </div>
              )}
              {(form.license_type === 'individual' || form.license_type === 'whitelabel') && whitelabels.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {form.license_type === 'individual' ? 'Vinculado ao Partner' : 'Partner existente (se ja criado)'}
                  </Label>
                  <Select value={form.parent_license_id} onValueChange={(v) => {
                    set('parent_license_id', v);
                  }}>
                    <SelectTrigger><SelectValue placeholder={form.license_type === 'individual' ? 'Selecione o Partner' : 'Novo Partner (sem vinculo)'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{form.license_type === 'individual' ? 'Contrato Direto (sem Partner)' : 'Novo Partner'}</SelectItem>
                      {whitelabels.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>{w.tenants?.name || w.whitelabel_slug || 'Partner'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Dados da Empresa */}
          <section className="bg-muted/30 p-4 border border-border space-y-4">
            <SectionTitle>Dados da Empresa</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">CNPJ / CPF</Label>
                <Input
                  value={tenantFields.cpf_cnpj}
                  onChange={(e) => setTenantFields(f => ({ ...f, cpf_cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Telefone / WhatsApp</Label>
                <Input
                  value={tenantFields.phone}
                  onChange={(e) => setTenantFields(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </section>

          {/* Datas */}
          <section className="bg-muted/30 p-4 border border-border space-y-4">
            <SectionTitle>Datas do Contrato</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DateField label="Ativação" value={form.starts_at} onChange={(v) => set('starts_at', v)} />
              <DateField label="Vencimento" value={form.expires_at} onChange={(v) => set('expires_at', v)} />
              <DateField label="Cancelado" value={form.cancelled_at} onChange={(v) => set('cancelled_at', v)} />
              <DateField label="Bloqueio" value={form.blocked_at} onChange={(v) => set('blocked_at', v)} />
              <DateField label="Desbloqueio" value={form.unblocked_at} onChange={(v) => set('unblocked_at', v)} />
            </div>
          </section>

          {/* Plano Base */}
          <section className="space-y-2">
            <SectionTitle>Plano Base</SectionTitle>
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
          </section>

          {/* Recursos Contratados */}
          <section className="space-y-2">
            <SectionTitle>Recursos Contratados</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <NumField label="Atendentes Base" value={form.base_attendants} onChange={(v) => set('base_attendants', v)} />
              <NumField label="Extra Atendentes" value={form.extra_attendants} onChange={(v) => set('extra_attendants', v)} />
              <NumField label="Disp. Web (base)" value={form.base_devices_web} onChange={(v) => set('base_devices_web', v)} />
              <NumField label="Disp. Web Extra" value={form.extra_devices_web} onChange={(v) => set('extra_devices_web', v)} />
              <NumField label="Disp. Oficial (base)" value={form.base_devices_meta} onChange={(v) => set('base_devices_meta', v)} />
              <NumField label="Disp. Oficial Extra" value={form.extra_devices_meta} onChange={(v) => set('extra_devices_meta', v)} />
              <NumField label="Msgs/mês" value={form.monthly_messages_limit} onChange={(v) => set('monthly_messages_limit', v)} />
              <NumField label="Storage (GB)" value={form.storage_limit_gb} onChange={(v) => set('storage_limit_gb', v)} />
            </div>
          </section>

          {/* Add-ons I.A. */}
          <section className="space-y-3">
            <SectionTitle>Add-ons I.A.</SectionTitle>
            <div className="grid grid-cols-1 gap-2">
              <AddonRow
                label="Auditor de Qualidade"
                sublabel="+R$ 99/mês — Avalia atendimentos e recomenda melhorias."
                checked={form.has_ia_auditor}
                onChange={(v) => set('has_ia_auditor', v)}
              />
              <AddonRow
                label="Copiloto do Consultor"
                sublabel="+R$ 149/mês — Sugestões de respostas e contorno de objeções."
                checked={form.has_ia_copiloto}
                onChange={(v) => set('has_ia_copiloto', v)}
              />
              <AddonRow
                label="Closer Autônomo"
                sublabel="+R$ 199/mês — Automatiza primeiro contato e qualificação."
                checked={form.has_ia_closer}
                onChange={(v) => set('has_ia_closer', v)}
              />
              <AddonRow
                label="Módulo I.A. Legacy"
                sublabel="+R$ 350/mês — Módulo legado de I.A. com agentes configuráveis."
                checked={form.has_ai_module}
                onChange={(v) => set('has_ai_module', v)}
              />
            </div>
            <AddonRow
              label="Implantação Starter"
              sublabel="+R$ 2.000 único — Configuração inicial e treinamento."
              checked={form.has_implantacao_starter}
              onChange={(v) => set('has_implantacao_starter', v)}
            />
          </section>

          {/* Facilite */}
          <section className="space-y-2">
            <SectionTitle>Facilite Whatsflow</SectionTitle>
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
          </section>

          {/* Cobrança e Pagamento */}
          <section className="bg-muted/30 p-4 border border-border space-y-4">
            <SectionTitle>Cobrança e Pagamento</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Pagamento</Label>
                <Select value={form.payment_type} onValueChange={(v) => set('payment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="debito">Débito em Conta</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Condição</Label>
                <Select value={form.payment_condition} onValueChange={(v) => set('payment_condition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Ciclo de Cobrança</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => set('billing_cycle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Link de Checkout</Label>
              <Input
                value={form.checkout_url}
                onChange={(e) => set('checkout_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </section>

          {/* Split de Pagamento */}
          <section className="bg-muted/30 p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <SectionTitle>Split de Pagamento</SectionTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Divisão de receita entre recebedores</p>
              </div>
              <Switch
                checked={split.enabled}
                onCheckedChange={(v) => setSplit({ ...split, enabled: v })}
              />
            </div>
            {split.enabled && (
              <div className="space-y-3">
                <div className="border border-primary/20 bg-primary/5 p-2.5">
                  <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    O split é aplicado no momento da cobrança via Asaas
                  </p>
                </div>
                {split.recipients.map((r, idx) => (
                  <SplitRow
                    key={r.id}
                    index={idx}
                    recipient={r}
                    salesPeople={salesPeople}
                    canRemove={split.recipients.length > 1}
                    onUpdate={(patch) => setSplit({
                      ...split,
                      recipients: split.recipients.map(x => x.id === r.id ? { ...x, ...patch } : x),
                    })}
                    onRemove={() => setSplit({ ...split, recipients: split.recipients.filter(x => x.id !== r.id) })}
                  />
                ))}
                <Button
                  variant="outline" size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => setSplit({ ...split, recipients: [...split.recipients, newRecipient()] })}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Recebedor
                </Button>
                {split.recipients.some(r => r.splitValue) && (() => {
                  const total = split.recipients
                    .filter(r => r.splitType === 'PERCENTAGE' && r.splitValue)
                    .reduce((s, r) => s + parseFloat(r.splitValue || '0'), 0);
                  return total > 100 ? (
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      A soma dos percentuais não pode exceder 100% (atual: {total.toFixed(2)}%)
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </section>

          {/* Pricing Config — valores que o cliente vê na Assinatura */}
          <section className="space-y-3">
            <SectionTitle>Precos para o Cliente (Assinatura)</SectionTitle>
            <p className="text-[10px] text-muted-foreground">Valores unitarios por faixa. O cliente ve o preco da faixa atual dele.</p>

            {/* Tiered pricing tables */}
            {([
              { label: 'Disp. Web WhatsApp', tierKey: 'device_web_tiers', defaults: [{min:1,max:5,price:150},{min:6,max:20,price:125},{min:21,max:50,price:100}] },
              { label: 'Disp. Meta Cloud', tierKey: 'device_meta_tiers', defaults: [{min:1,max:5,price:100},{min:6,max:20,price:70},{min:21,max:50,price:50}] },
              { label: 'Atendentes', tierKey: 'attendant_tiers', defaults: [{min:1,max:5,price:80},{min:6,max:10,price:75},{min:11,max:20,price:70},{min:21,max:50,price:60}] },
            ] as const).map(({ label, tierKey, defaults }) => {
              const tiers = form.pricing_config?.[tierKey] || [...defaults];
              return (
                <div key={tierKey} className="border border-border rounded p-2">
                  <p className="text-[10px] font-semibold mb-1">{label}</p>
                  <div className="space-y-1">
                    {tiers.map((tier: any, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-1 items-center">
                        <span className="text-[9px] text-muted-foreground">{String(tier.min).padStart(2,'0')} a {String(tier.max).padStart(2,'0')}</span>
                        <Input
                          type="number" min={0} step={1}
                          value={tier.price}
                          onChange={(e) => {
                            const updated = [...tiers];
                            updated[i] = { ...tier, price: Number(e.target.value) };
                            set('pricing_config', { ...form.pricing_config, [tierKey]: updated });
                          }}
                          className="h-6 text-[10px] px-1"
                        />
                        <span className="text-[9px] text-muted-foreground">R$/un</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Fixed prices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { key: 'ai_module_price', label: 'Modulo I.A.' },
                { key: 'facilite_basico_price', label: 'Facilite Basico' },
                { key: 'facilite_intermediario_price', label: 'Facilite Interm.' },
                { key: 'facilite_avancado_price', label: 'Facilite Avancado' },
                { key: 'implantacao_price', label: 'Implantacao' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-[10px]">{label}</Label>
                  <Input
                    type="number" min={0} step={0.01}
                    value={form.pricing_config?.[key] ?? ''}
                    onChange={(e) => set('pricing_config', { ...form.pricing_config, [key]: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Observações */}
          <section className="space-y-2">
            <SectionTitle>Observacao Interna</SectionTitle>
            <Textarea value={form.internal_notes} onChange={(e) => set('internal_notes', e.target.value)} placeholder="Visível apenas no Nexus..." className="min-h-[60px]" />
          </section>

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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {!isEdit && (
              <Button
                variant="secondary"
                onClick={() => setDirectActivateOpen(true)}
                disabled={saving}
                className="gap-1.5"
              >
                <KeyRound className="h-4 w-4" />
                Ativar sem e-mail
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isEdit ? 'Salvar Licença' : 'Criar e Enviar E-mail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Activation Dialog */}
      <Dialog open={directActivateOpen} onOpenChange={setDirectActivateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Ativar Licença Diretamente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Cria o usuário com a senha definida abaixo. O cliente poderá fazer login imediatamente, sem precisar de e-mail.
            </p>
            <div className="space-y-2">
              <Label>Senha de acesso</Label>
              <Input
                type="text"
                placeholder="Defina a senha do cliente"
                value={directPassword}
                onChange={(e) => setDirectPassword(e.target.value)}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">Mínimo 6 caracteres. Informe ao cliente.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectActivateOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleDirectActivate}
              disabled={activating || !directPassword || directPassword.length < 6}
              className="gap-1.5"
            >
              {activating && <Loader2 className="h-4 w-4 animate-spin" />}
              Ativar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" className="h-8 text-sm" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="date" className="h-8 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AddonRow({ label, sublabel, checked, onChange }: { label: string; sublabel: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded border border-border">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SplitRow({
  index, recipient, salesPeople, canRemove, onUpdate, onRemove,
}: {
  index: number;
  recipient: SplitRecipient;
  salesPeople: SalesPerson[];
  canRemove: boolean;
  onUpdate: (patch: Partial<SplitRecipient>) => void;
  onRemove: () => void;
}) {
  const selected = salesPeople.find(s => s.id === recipient.salespersonId);
  return (
    <div className="border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Recebedor #{index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Vendedor / Recebedor</Label>
        <Select
          value={recipient.salespersonId}
          onValueChange={(v) => {
            const p = salesPeople.find(s => s.id === v);
            onUpdate({
              salespersonId: v,
              walletId: p?.asaas_wallet_id || '',
              splitValue: p?.commission_percent ? String(p.commission_percent) : recipient.splitValue,
            });
          }}
        >
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione o recebedor" /></SelectTrigger>
          <SelectContent>
            {salesPeople.filter(s => s.is_active).map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.commission_percent ? ` (${s.commission_percent}%)` : ''}
                {!s.asaas_wallet_id && <AlertCircle className="inline h-3 w-3 text-destructive ml-1" />}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected?.asaas_wallet_id && (
        <div className="border border-border bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">
            Wallet ID: <span className="font-mono text-foreground">{selected.asaas_wallet_id}</span>
          </p>
        </div>
      )}
      {!recipient.salespersonId && (
        <div className="space-y-1.5">
          <Label className="text-xs">Wallet ID manual</Label>
          <Input
            value={recipient.walletId}
            onChange={(e) => onUpdate({ walletId: e.target.value })}
            placeholder="Wallet ID da conta Asaas"
            className="h-9 text-xs font-mono"
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={recipient.splitType}
            onValueChange={(v) => onUpdate({ splitType: v as 'PERCENTAGE' | 'FIXED' })}
          >
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
              <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{recipient.splitType === 'PERCENTAGE' ? 'Comissão (%)' : 'Valor (R$)'}</Label>
          <Input
            type="number"
            step={recipient.splitType === 'PERCENTAGE' ? '0.0001' : '0.01'}
            min="0"
            max={recipient.splitType === 'PERCENTAGE' ? '100' : undefined}
            value={recipient.splitValue}
            onChange={(e) => onUpdate({ splitValue: e.target.value })}
            placeholder={recipient.splitType === 'PERCENTAGE' ? '10' : '50.00'}
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
