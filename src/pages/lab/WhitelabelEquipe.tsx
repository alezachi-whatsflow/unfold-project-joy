import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Pencil, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type InvitationStatus = 'pending' | 'invited' | 'accepted' | 'active';

const ROLE_COLOR_MAP: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/25',
  gestor: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  operador: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  financeiro: 'bg-green-500/15 text-green-400 border-green-500/25',
  visualizador: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  superadmin_whatsflow: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  operador: 'Operador',
  financeiro: 'Financeiro',
  visualizador: 'Visualizador',
  superadmin_whatsflow: 'SuperAdmin Whatsflow',
};

const INVITE_ROLES = ['admin', 'gestor', 'operador', 'financeiro', 'visualizador'] as const;

function MetricPill({ label, value, color = 'default' }: { label: string; value: number; color?: 'default' | 'green' | 'amber' | 'gray' }) {
  const colors = {
    default: 'bg-muted text-foreground border-border',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    gray: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${colors[color]}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

const STATUS_ORDER: Record<string, number> = { pending: 0, invited: 1, accepted: 2, active: 3 };

function StatusBadges({ status }: { status: InvitationStatus }) {
  const current = STATUS_ORDER[status] ?? 0;
  const steps = [
    { key: 'invited', label: 'Convite Enviado' },
    { key: 'accepted', label: 'Link Acessado' },
    { key: 'active', label: 'Conta Ativa' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step) => {
        const isComplete = current >= STATUS_ORDER[step.key];
        return (
          <span
            key={step.key}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border ${
              isComplete
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-muted/50 text-muted-foreground/40 border-border'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

function getInvitationStatus(profile: any): InvitationStatus {
  if (profile.invitation_status === 'active') return 'active';
  if (profile.invitation_status === 'accepted') return 'accepted';
  if (profile.invitation_status === 'invited') return 'invited';
  return 'pending';
}

function InviteMemberDialog({ open, onOpenChange, tenantId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; tenantId: string; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operador');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!name.trim() || !email.trim()) { toast.error('Preencha nome e e-mail.'); return; }
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, full_name: name, role, tenant_id: tenantId }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao convidar usuário.');
      toast.success(result.message || `Convite enviado para ${email}`);
      setName(''); setEmail(''); setRole('operador');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao convidar usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Membro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do membro" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Perfil de acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleInvite} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Enviar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WhitelabelEquipe() {
  const { config } = useOutletContext<{ config: any }>();
  const whitelabelLicenseId = config?.licenses?.id;
  const whitelabelTenantId = config?.licenses?.tenant_id;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (whitelabelLicenseId) loadUsers();
  }, [whitelabelLicenseId]);

  async function loadUsers() {
    setLoading(true);
    const { data: subLicenses } = await supabase
      .from('licenses')
      .select('tenant_id')
      .eq('parent_license_id', whitelabelLicenseId);

    const managedTenantIds = [
      whitelabelTenantId,
      ...(subLicenses || []).map((l: any) => l.tenant_id),
    ].filter(Boolean);

    if (managedTenantIds.length === 0) { setUsers([]); setLoading(false); return; }

    const { data } = await supabase
      .from('profiles')
      .select('*, user_tenants!inner(tenant_id, role)')
      .in('user_tenants.tenant_id', managedTenantIds)
      .order('created_at', { ascending: false });

    setUsers(data || []);
    setLoading(false);
  }

  const activeCount = users.filter(u => u.invitation_status === 'active').length;
  const pendingCount = users.filter(u => u.invitation_status === 'invited' || u.invitation_status === 'accepted').length;
  const inactiveCount = users.filter(u => !u.invitation_status || u.invitation_status === 'inactive').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Equipe
          </h1>
          <p className="text-sm text-muted-foreground">{users.length} membros em {config?.display_name}</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Adicionar Membro
        </Button>
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantId={whitelabelTenantId}
        onSaved={loadUsers}
      />

      <div className="flex flex-wrap gap-3">
        <MetricPill label="Total" value={users.length} />
        <MetricPill label="Ativos" value={activeCount} color="green" />
        <MetricPill label="Pendentes" value={pendingCount} color="amber" />
        <MetricPill label="Inativos" value={inactiveCount} color="gray" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[var(--radius)] bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum membro encontrado neste whitelabel.</p>
          <p className="text-xs mt-1">Clique em "Adicionar Membro" para convidar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => {
            const role = user.user_tenants?.[0]?.role || 'operador';
            const initials = (user.display_name || user.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            const status = getInvitationStatus(user);
            const roleClasses = ROLE_COLOR_MAP[role] || 'bg-blue-500/15 text-blue-400 border-blue-500/25';

            return (
              <div key={user.id} className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius)] bg-card border border-border">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground text-sm leading-tight">{user.display_name || user.email || 'Sem nome'}</span>
                    <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full border w-fit ${roleClasses}`}>
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <StatusBadges status={status} />
                </div>

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                </span>

                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button className="w-7 h-7 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}