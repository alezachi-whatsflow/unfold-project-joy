import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Pencil, Trash2, CheckCircle2, Mail, UserCheck } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

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

type InvitationStatus = 'pending' | 'invited' | 'accepted' | 'active';

const STATUS_ORDER: Record<string, number> = { pending: 0, invited: 1, accepted: 2, active: 3 };

const STEPS = [
  { key: 'invited', label: 'Convite Enviado', icon: Mail },
  { key: 'accepted', label: 'Link Acessado', icon: UserCheck },
  { key: 'active', label: 'Conta Ativa', icon: CheckCircle2 },
] as const;

function InlineTimeline({ status, invitedAt, acceptedAt }: { status: InvitationStatus; invitedAt?: string | null; acceptedAt?: string | null }) {
  const currentStep = STATUS_ORDER[status] ?? 0;
  const dates: Record<string, string | null> = {
    invited: invitedAt ? new Date(invitedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    accepted: acceptedAt ? new Date(acceptedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
    active: null,
  };

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const stepOrder = STATUS_ORDER[step.key];
        const isComplete = currentStep >= stepOrder;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center text-center gap-0.5 min-w-[80px]">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors ${
                isComplete
                  ? 'bg-emerald-500 border-emerald-500 text-emerald-950'
                  : 'border-muted-foreground/30 text-muted-foreground/40'
              }`}>
                {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isComplete ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                {step.label}
              </span>
              {dates[step.key] && isComplete && (
                <span className="text-[9px] text-muted-foreground">{dates[step.key]}</span>
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 mx-0.5 rounded ${currentStep > stepOrder ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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

function getInvitationStatus(profile: any): InvitationStatus {
  if (profile.invitation_status === 'active') return 'active';
  if (profile.invitation_status === 'accepted') return 'accepted';
  if (profile.invitation_status === 'invited') return 'invited';
  return 'pending';
}

export default function WhitelabelEquipe() {
  const { config } = useOutletContext<{ config: any }>();
  const whitelabelLicenseId = config?.licenses?.id;
  const whitelabelTenantId = config?.licenses?.tenant_id;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

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
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground">Perfil</TableHead>
                <TableHead className="text-muted-foreground">Status do Convite</TableHead>
                <TableHead className="text-muted-foreground">Criado em</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => {
                const role = user.user_tenants?.[0]?.role || 'operador';
                const initials = (user.display_name || user.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const status = getInvitationStatus(user);
                const roleClasses = ROLE_COLOR_MAP[role] || 'bg-blue-500/15 text-blue-400 border-blue-500/25';

                return (
                  <TableRow key={user.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                          {initials}
                        </div>
                        <span className="font-medium text-foreground">{user.display_name || user.email || 'Sem nome'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full border ${roleClasses}`}>
                        {ROLE_LABELS[role] || role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InlineTimeline
                        status={status}
                        invitedAt={user.invited_at}
                        acceptedAt={user.invite_accepted_at}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="w-7 h-7 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
