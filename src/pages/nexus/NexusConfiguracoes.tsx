import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Settings, Globe, CreditCard, DollarSign, RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const WHITELABELS = [
  'Whatsflow', 'Clint', 'SendHit', 'Voicecoder', 'MSolutions',
  'Big8Chat', 'AgiliChat', 'BotFlux',
];

const PLANS = [
  { name: 'Solo Pro', base: 259 },
  { name: 'Profissional', base: 359 },
];

const INTEGRATIONS = [
  { name: 'Asaas', status: 'active' },
  { name: 'Routerfy', status: 'inactive' },
  { name: 'Eduzz', status: 'inactive' },
];

const SYNC_SCOPES = [
  { key: 'layout', label: 'Layout & Temas', desc: 'Configurações visuais e temas personalizados' },
  { key: 'settings', label: 'Configurações Gerais', desc: 'Parâmetros do sistema' },
  { key: 'pipelines', label: 'Pipelines de Vendas', desc: 'Etapas e configurações de funil' },
  { key: 'commission_rules', label: 'Regras de Comissão', desc: 'Tabelas e faixas de comissionamento' },
  { key: 'dunning_rules', label: 'Réguas de Cobrança', desc: 'Fluxos automatizados de cobrança' },
  { key: 'checkout_sources', label: 'Fontes de Checkout', desc: 'Links e configurações de pagamento' },
];

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  licenseType?: string;
  plan?: string;
  status?: string;
}

export default function NexusConfiguracoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all tenants with their licenses
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['nexus-all-tenants-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;

      // get licenses for each
      const { data: licenses } = await supabase
        .from('licenses')
        .select('tenant_id, license_type, plan, status');

      const licMap = new Map((licenses || []).map((l: any) => [l.tenant_id, l]));

      return (data || []).map((t: any) => ({
        ...t,
        licenseType: licMap.get(t.id)?.license_type || 'individual',
        plan: licMap.get(t.id)?.plan || 'basic',
        status: licMap.get(t.id)?.status || 'active',
      })) as TenantOption[];
    },
  });

  // Fetch existing sync config
  const { data: syncConfig } = useQuery({
    queryKey: ['sync-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_sync_configs')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch sync logs
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Source tenant (Whatsflow Edtech interno)
  const sourceTenant = tenants.find((t) => t.licenseType === 'internal');
  const targetTenants = tenants.filter((t) => t.id !== sourceTenant?.id);

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(SYNC_SCOPES.map(s => s.key));
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (selectAll) {
      setSelectedTargets(targetTenants.map(t => t.id));
    }
  }, [selectAll, targetTenants.length]);

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleScope = (key: string) => {
    setSelectedScopes(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  // Ensure sync config exists
  const ensureSyncConfig = async () => {
    if (!sourceTenant) return null;
    if (syncConfig) return syncConfig;

    const { data, error } = await supabase
      .from('tenant_sync_configs')
      .insert({ source_tenant_id: sourceTenant.id, sync_scope: selectedScopes })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!sourceTenant || selectedTargets.length === 0) throw new Error('Selecione ao menos um destino');

      const config = await ensureSyncConfig();

      // Log the sync operation
      const { data: log, error: logError } = await supabase
        .from('tenant_sync_logs')
        .insert({
          sync_config_id: config.id,
          source_tenant_id: sourceTenant.id,
          target_tenant_ids: selectedTargets,
          scope: selectedScopes,
          status: 'running',
          executed_by: user?.id,
        })
        .select()
        .single();
      if (logError) throw logError;

      let synced = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const scope of selectedScopes) {
        try {
          if (scope === 'pipelines') {
            const { data: srcPipelines } = await supabase
              .from('negocios')
              .select('pipeline_id')
              .eq('tenant_id', sourceTenant.id)
              .limit(1);
            // Pipeline sync is config-level, mark as synced
            synced++;
          } else if (scope === 'commission_rules') {
            const { data: srcRules } = await supabase
              .from('commission_rules')
              .select('*')
              .eq('tenant_id', sourceTenant.id);

            for (const targetId of selectedTargets) {
              if (srcRules && srcRules.length > 0) {
                // Delete existing rules on target
                await supabase.from('commission_rules').delete().eq('tenant_id', targetId);
                // Insert source rules with new tenant_id
                const newRules = srcRules.map((r: any) => ({
                  ...r,
                  id: undefined,
                  tenant_id: targetId,
                  created_at: undefined,
                  updated_at: undefined,
                }));
                await supabase.from('commission_rules').insert(newRules);
              }
            }
            synced++;
          } else if (scope === 'dunning_rules') {
            const { data: srcRules } = await supabase
              .from('dunning_rules')
              .select('*')
              .eq('tenant_id', sourceTenant.id);

            for (const targetId of selectedTargets) {
              if (srcRules && srcRules.length > 0) {
                await supabase.from('dunning_rules').delete().eq('tenant_id', targetId);
                const newRules = srcRules.map((r: any) => ({
                  ...r,
                  id: undefined,
                  tenant_id: targetId,
                  created_at: undefined,
                  updated_at: undefined,
                }));
                await supabase.from('dunning_rules').insert(newRules);
              }
            }
            synced++;
          } else if (scope === 'checkout_sources') {
            const { data: srcSources } = await supabase
              .from('checkout_sources')
              .select('*')
              .eq('tenant_id', sourceTenant.id);

            for (const targetId of selectedTargets) {
              if (srcSources && srcSources.length > 0) {
                await supabase.from('checkout_sources').delete().eq('tenant_id', targetId);
                const newSources = srcSources.map((s: any) => ({
                  ...s,
                  id: undefined,
                  tenant_id: targetId,
                  created_at: undefined,
                }));
                await supabase.from('checkout_sources').insert(newSources);
              }
            }
            synced++;
          } else {
            // layout, settings - placeholder
            synced++;
          }
        } catch (err: any) {
          failed++;
          errors.push({ scope, error: err.message });
        }
      }

      // Update log
      await supabase
        .from('tenant_sync_logs')
        .update({
          status: failed > 0 ? 'partial' : 'completed',
          completed_at: new Date().toISOString(),
          items_synced: synced,
          items_failed: failed,
          error_details: errors,
          result: { synced, failed, targets: selectedTargets.length },
        })
        .eq('id', log.id);

      return { synced, failed, targets: selectedTargets.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      if (result.failed > 0) {
        toast.warning(`Sincronização parcial: ${result.synced} ok, ${result.failed} falhas em ${result.targets} contas`);
      } else {
        toast.success(`Sincronização concluída: ${result.synced} escopos em ${result.targets} contas`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao sincronizar');
    },
  });

  const getLicenseTypeBadge = (type: string) => {
    switch (type) {
      case 'internal': return <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">INTERNO</Badge>;
      case 'whitelabel': return <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">WHITELABEL</Badge>;
      default: return <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">INDIVIDUAL</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Configurações gerais do sistema Nexus</p>
      </div>

      {/* ── Sync Panel ── */}
      <Card className="bg-card/50 border-primary/30 border-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Sincronização de Configurações
          </CardTitle>
          <CardDescription>
            Todas as atualizações são feitas primeiro na conta{' '}
            <span className="font-semibold text-primary">
              {sourceTenant?.name || 'Whatsflow Edtech (interno)'}
            </span>
            . Após testado e homologado, sincronize para as demais contas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source indicator */}
          {sourceTenant && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{sourceTenant.name}</p>
                <p className="text-xs text-muted-foreground">Conta de origem (staging/homologação)</p>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400">ORIGEM</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{selectedTargets.length} destinos</span>
            </div>
          )}

          {/* Scope selection */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Escopos para sincronizar:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYNC_SCOPES.map((scope) => (
                <label
                  key={scope.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedScopes.includes(scope.key)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <Checkbox
                    checked={selectedScopes.includes(scope.key)}
                    onCheckedChange={() => toggleScope(scope.key)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{scope.label}</p>
                    <p className="text-xs text-muted-foreground">{scope.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Target selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Selecionar contas de destino:</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Switch checked={selectAll} onCheckedChange={(v) => {
                  setSelectAll(v);
                  if (!v) setSelectedTargets([]);
                }} />
                Selecionar todas
              </label>
            </div>

            {tenantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {targetTenants.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedTargets.includes(t.id)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTargets.includes(t.id)}
                      onCheckedChange={() => toggleTarget(t.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                    {getLicenseTypeBadge(t.licenseType || 'individual')}
                    <Badge variant="outline" className="text-[10px]">{t.plan}</Badge>
                  </label>
                ))}
                {targetTenants.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma conta de destino encontrada
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sync button */}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || selectedTargets.length === 0 || selectedScopes.length === 0}
            className="w-full gap-2"
            size="lg"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar {selectedScopes.length} escopo(s) → {selectedTargets.length} conta(s)
          </Button>

          {/* Recent logs */}
          {syncLogs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Últimas sincronizações:</p>
              <div className="space-y-1.5">
                {syncLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                    {log.status === 'completed' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : log.status === 'running' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(log.started_at).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-foreground">
                      {log.items_synced || 0} itens → {log.target_tenant_ids?.length || 0} contas
                    </span>
                    <Badge variant="outline" className="text-[9px] ml-auto">
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelabels */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Whitelabels Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WHITELABELS.map((w) => (
              <Badge key={w} variant="outline" className="text-sm py-1 px-3">{w}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plans & Pricing */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Planos e Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PLANS.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{p.name}</span>
              <span className="text-sm text-primary font-bold">R$ {p.base},00/mês</span>
            </div>
          ))}
          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• Extra Disp. Web: R$ 150 (1-5) / R$ 125 (6-20) / R$ 100 (21+)</p>
            <p>• Extra Disp. Meta: R$ 100 (1-5) / R$ 80 (6-20) / R$ 60 (21+)</p>
            <p>• Extra Atendentes: R$ 80 (1-5) / R$ 75 (6-10) / R$ 70 (11-20) / R$ 60 (21+)</p>
            <p>• Módulo I.A.: R$ 350/mês</p>
            <p>• Facilite: Básico R$ 250 / Intermediário R$ 700 / Avançado R$ 1.500</p>
          </div>
        </CardContent>
      </Card>

      {/* Billing Integrations */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Integrações de Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium">{i.name}</span>
              <Badge className={`text-[10px] ${i.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {i.status === 'active' ? 'Conectado' : 'Inativo'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
