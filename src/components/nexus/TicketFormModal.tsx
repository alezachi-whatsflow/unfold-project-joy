import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  ticket?: any;
  defaultLicenseId?: string;
}

export default function TicketFormModal({ open, onOpenChange, onSaved, ticket, defaultLicenseId }: Props) {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const isEdit = !!ticket;
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    priority: ticket?.priority || 'normal',
    status: ticket?.status || 'aberto',
    assigned_to: ticket?.assigned_to || '',
    license_id: ticket?.license_id || defaultLicenseId || '',
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (open) {
      supabase.from('nexus_users').select('id, name').eq('is_active', true).then(({ data }) => setMembers(data || []));
      supabase.from('licenses').select('id, tenants!inner(name)').limit(200).then(({ data }) => setLicenses(data || []));
    }
  }, [open]);

  async function handleSave() {
    if (!form.title.trim()) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return; }
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      assigned_to: form.assigned_to || null,
      license_id: form.license_id || null,
      ...(isEdit ? {} : { created_by: nexusUser?.id }),
    };

    if (isEdit) {
      await supabase.from('nexus_tickets').update(payload).eq('id', ticket.id);
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'ticket_update', target_entity: form.title,
      });
    } else {
      await supabase.from('nexus_tickets').insert(payload);
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'ticket_create', target_entity: form.title,
      });
    }

    toast({ title: isEdit ? 'Ticket atualizado' : 'Ticket criado' });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ticket' : 'Novo Ticket'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Atribuir para</Label>
            <Select value={form.assigned_to} onValueChange={(v) => set('assigned_to', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Licença vinculada</Label>
            <Select value={form.license_id} onValueChange={(v) => set('license_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar licença..." /></SelectTrigger>
              <SelectContent>
                {licenses.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.tenants?.name || l.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? 'Atualizar' : 'Criar Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
