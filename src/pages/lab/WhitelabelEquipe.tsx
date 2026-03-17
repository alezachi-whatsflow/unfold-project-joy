import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserTimelineRow } from '@/components/nexus/UserTimelineRow';

function MetricPill({ label, value, color = 'default' }: { label: string; value: number; color?: 'default' | 'green' | 'amber' | 'gray' }) {
  const colors = {
    default: { bg: 'rgba(255,255,255,0.05)', text: 'hsl(var(--foreground))', border: 'rgba(255,255,255,0.1)' },
    green:   { bg: 'rgba(17,188,118,0.12)',  text: '#39F7B2',               border: 'rgba(17,188,118,0.25)' },
    amber:   { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B',               border: 'rgba(245,158,11,0.25)' },
    gray:    { bg: 'rgba(75,85,99,0.12)',     text: '#6B7280',               border: 'rgba(75,85,99,0.25)' },
  };
  const c = colors[color];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      fontSize: 13, fontWeight: 600, color: c.text,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
      <span style={{ opacity: 0.8 }}>{label}</span>
    </div>
  );
}

type TimelineStage = {
  id: string;
  label: string;
  labelMobile: string;
  status: 'done' | 'current' | 'pending';
  timestamp?: string;
};

function buildProfileStages(profile: any): TimelineStage[] {
  const invited = !!profile.invited_at;
  const accepted = !!profile.invite_accepted_at;
  const active = profile.invitation_status === 'active';

  return [
    {
      id: 'invite',
      label: 'Convite Enviado',
      labelMobile: '✉',
      status: invited ? 'done' : 'pending',
      timestamp: profile.invited_at ? new Date(profile.invited_at).toLocaleString('pt-BR') : undefined,
    },
    {
      id: 'link',
      label: 'Link Acessado',
      labelMobile: '🔗',
      status: accepted ? 'done' : invited ? 'current' : 'pending',
      timestamp: profile.invite_accepted_at ? new Date(profile.invite_accepted_at).toLocaleString('pt-BR') : undefined,
    },
    {
      id: 'active',
      label: 'Conta Ativa',
      labelMobile: '✓',
      status: active ? 'done' : accepted ? 'current' : 'pending',
    },
  ];
}

function getOverallStatus(profile: any): 'active' | 'pending' | 'blocked' | 'inactive' {
  if (profile.invitation_status === 'active') return 'active';
  if (profile.invitation_status === 'invited' || profile.invitation_status === 'accepted') return 'pending';
  return 'inactive';
}

const ROLE_COLOR_MAP: Record<string, 'red' | 'blue' | 'green' | 'amber' | 'purple'> = {
  admin: 'red',
  gestor: 'amber',
  operador: 'blue',
  financeiro: 'green',
  visualizador: 'purple',
};

export default function WhitelabelEquipe() {
  const { config } = useOutletContext<{ config: any }>();
  const tenantId = config?.licenses?.tenant_id;
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) loadUsers();
  }, [tenantId]);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, user_tenants!inner(tenant_id, role)')
      .eq('user_tenants.tenant_id', tenantId)
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
          <p className="text-sm text-muted-foreground">{users.length} membros</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <MetricPill label="Total" value={users.length} />
        <MetricPill label="Ativos" value={activeCount} color="green" />
        <MetricPill label="Pendentes" value={pendingCount} color="amber" />
        <MetricPill label="Inativos" value={inactiveCount} color="gray" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[70px] rounded-[var(--radius)] bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum membro encontrado neste tenant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(user => {
            const role = user.user_tenants?.[0]?.role || 'operador';
            return (
              <UserTimelineRow
                key={user.id}
                id={user.id}
                name={user.display_name || user.email || 'Sem nome'}
                initials={(user.display_name || user.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                role={role}
                roleColor={ROLE_COLOR_MAP[role] || 'blue'}
                stages={buildProfileStages(user)}
                overallStatus={getOverallStatus(user)}
                expiresAt={user.invite_accepted_at ? new Date(user.invite_accepted_at).toLocaleDateString('pt-BR') : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
