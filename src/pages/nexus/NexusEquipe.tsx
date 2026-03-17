import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Plus, Users, MoreHorizontal, Edit, UserCheck, UserX } from 'lucide-react';
import { NEXUS_ROLE_LABELS, NEXUS_ROLE_COLORS, type NexusRole, useNexus } from '@/contexts/NexusContext';
import TeamMemberModal from '@/components/nexus/TeamMemberModal';
import { useToast } from '@/hooks/use-toast';

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

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${NEXUS_ROLE_COLORS[u.role as NexusRole] || ''}`}>
                        {NEXUS_ROLE_LABELS[u.role as NexusRole] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditMember(u); setShowModal(true); }}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(u)}>
                            {u.is_active ? <><UserX className="h-3.5 w-3.5 mr-2" /> Desativar</> : <><UserCheck className="h-3.5 w-3.5 mr-2" /> Ativar</>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <TeamMemberModal open={showModal} onOpenChange={setShowModal} onSaved={loadUsers} member={editMember} />
      )}
    </div>
  );
}
