import { fmtDate } from "@/lib/dateUtils";
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = ['basic', 'professional', 'enterprise'] as const;
const PLAN_LABELS: Record<string, string> = { basic: 'Básico', professional: 'Profissional', enterprise: 'Enterprise' };

function NewLicenseDialog({ open, onOpenChange, parentLicenseId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; parentLicenseId: string; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('basic');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) { toast.error('Preencha nome e e-mail.'); return; }
    setSaving(true);
    try {
      // Create tenant first
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name, email, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) })
        .select('id')
        .single();
      if (tenantErr) throw tenantErr;

      // Create sub-license linked to parent
      const { error: licErr } = await supabase
        .from('licenses')
        .insert({
          tenant_id: tenant.id,
          parent_license_id: parentLicenseId,
          plan,
          license_type: 'individual',
          status: 'active',
        });
      if (licErr) throw licErr;

      toast.success(`Licença criada para ${name}`);
      setName(''); setEmail(''); setPlan('basic');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar licença.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Sub-Licença</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Empresa / Cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map(p => (
                  <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Criar Licença
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WhitelabelLicenses() {
  const { config } = useOutletContext<{ config: any }>();
  const licenseId = config?.licenses?.id;
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const { data: licenses, isLoading } = useQuery({
    queryKey: ['wl-licenses-list', licenseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('licenses')
        .select('*, tenants(name, email)')
        .eq('parent_license_id', licenseId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!licenseId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Licenças</h1>
          <p className="text-sm text-muted-foreground">Sub-licenças gerenciadas por {config?.display_name}</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Licença
        </Button>
      </div>

      <NewLicenseDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        parentLicenseId={licenseId}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['wl-licenses-list', licenseId] })}
      />

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !licenses?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma sub-licença encontrada.</p>
              <p className="text-xs mt-1">Clique em "Nova Licença" para criar a primeira.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.tenants?.name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{PLAN_LABELS[l.plan] || l.plan}</Badge></TableCell>
                    <TableCell><Badge variant={l.status === 'active' ? 'default' : 'secondary'}>{l.status}</Badge></TableCell>
                    <TableCell>R$ {(l.monthly_value || 0).toFixed(2)}</TableCell>
                    <TableCell>{l.expires_at ? fmtDate(l.expires_at) : '—'}</TableCell>
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