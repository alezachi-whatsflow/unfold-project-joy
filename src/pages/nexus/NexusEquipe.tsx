import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Users } from 'lucide-react';
import { useNexus, NEXUS_ROLE_LABELS } from '@/contexts/NexusContext';
import TeamMemberModal from '@/components/nexus/TeamMemberModal';
import { useToast } from '@/hooks/use-toast';
import { UserTimelineRow } from '@/components/nexus/UserTimelineRow';
import { buildUserStages, getUserOverallStatus, getRoleColor } from '@/utils/nexus/buildUserStages';

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

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 70, borderRadius: 'var(--radius)',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          animation: 'wf-shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  );
}

export default function NexusEquipe() {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from('nexus_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function toggleActive(member: any) {
    const newStatus = !member.is_active;
    await supabase.from('nexus_users').update({ is_active: newStatus }).eq('id', member.id);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'team_member_edit', target_entity: member.name,
      old_value: { is_active: member.is_active }, new_value: { is_active: newStatus },
    });
    toast({ title: newStatus ? 'Membro ativado' : 'Membro desativado' });
    loadUsers();
  }

  async function deleteMember(member: any) {
    if (!confirm(`Excluir permanentemente "${member.name}" da equipe Nexus?`)) return;
    const { error } = await supabase.from('nexus_users').delete().eq('id', member.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'team_member_delete', target_entity: member.name,
    });
    toast({ title: 'Membro excluído permanentemente' });
    loadUsers();
  }

  const activeCount = users.filter(u => u.is_active && u.last_login).length;
  const pendingCount = users.filter(u => !u.last_login && u.invite_sent_at).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Equipe Nexus
          </h1>
          <p className="text-sm text-muted-foreground">{users.length} membros</p>
        </div>
        <Button size="sm" onClick={() => { setEditMember(null); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Membro
        </Button>
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-3">
        <MetricPill label="Total" value={users.length} />
        <MetricPill label="Ativos" value={activeCount} color="green" />
        <MetricPill label="Pendentes" value={pendingCount} color="amber" />
        <MetricPill label="Inativos" value={inactiveCount} color="gray" />
      </div>

      {/* User timeline list */}
      {loading ? (
        <SkeletonList />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(user => (
            <UserTimelineRow
              key={user.id}
              id={user.id}
              name={user.name || 'Sem nome'}
              initials={(user.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              role={NEXUS_ROLE_LABELS[user.role as keyof typeof NEXUS_ROLE_LABELS] || user.role}
              roleColor={getRoleColor(user.role)}
              stages={buildUserStages(user)}
              overallStatus={getUserOverallStatus(user)}
              expiresAt={user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : undefined}
              onEdit={(id) => {
                const u = users.find(x => x.id === id);
                setEditMember(u || null);
                setShowModal(true);
              }}
              onDelete={(id) => {
                const u = users.find(x => x.id === id);
                if (u) deleteMember(u);
              }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <TeamMemberModal open={showModal} onOpenChange={setShowModal} onSaved={loadUsers} member={editMember} />
      )}
    </div>
  );
}
