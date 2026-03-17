import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNexus, NEXUS_ROLE_LABELS, type NexusRole } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  member?: any;
}

const ROLES: NexusRole[] = [
  'nexus_superadmin', 'nexus_dev_senior', 'nexus_suporte_senior',
  'nexus_financeiro', 'nexus_suporte_junior', 'nexus_customer_success',
];

export default function TeamMemberModal({ open, onOpenChange, onSaved, member }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const isEdit = !!member;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'nexus_suporte_junior',
    is_active: member?.is_active ?? true,
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (isEdit) {
      await supabase.from('nexus_users').update({
        name: form.name, role: form.role, is_active: form.is_active,
      }).eq('id', member.id);
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'team_member_edit', target_entity: form.name,
        old_value: { role: member.role }, new_value: { role: form.role },
      });
    } else {
      await supabase.from('nexus_users').insert({
        name: form.name, email: form.email, role: form.role,
        is_active: true, created_by: nexusUser?.id,
      });
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'team_member_create', target_entity: form.name,
      });
    }

    toast({ title: isEdit ? 'Membro atualizado' : 'Membro adicionado' });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={isEdit} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{NEXUS_ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
