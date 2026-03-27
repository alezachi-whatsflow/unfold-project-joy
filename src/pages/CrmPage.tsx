import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenants } from "@/hooks/useUserTenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Users, UserPlus, Phone, Mail, Building, Loader2 } from "lucide-react";

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { value: 'prospect', label: 'Prospect', color: 'bg-yellow-500' },
  { value: 'customer', label: 'Cliente', color: 'bg-green-500' },
  { value: 'churned', label: 'Churned', color: 'bg-red-500' },
];

export default function CrmPage() {
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', stage: 'lead', notes: '' });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['crm-contacts', tenantId, search, stageFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase.from('crm_contacts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200);
      if (stageFilter !== 'all') q = q.eq('stage', stageFilter);
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createContact = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Tenant não encontrado');
      const { error } = await supabase.from('crm_contacts').insert({ ...form, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contato criado!');
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      setDialogOpen(false);
      setForm({ name: '', phone: '', email: '', company: '', stage: 'lead', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stageInfo = (stage: string) => STAGES.find(s => s.value === stage) || STAGES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM — Contatos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus contatos e leads.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Contato</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div><Label>Empresa</Label><Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div><Label>Estágio</Label>
                <Select value={form.stage} onValueChange={v => setForm(p => ({ ...p, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createContact.mutate()} disabled={!form.name || createContact.isPending}>
                {createContact.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Criar Contato
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, telefone ou email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estágio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {STAGES.map(s => {
          const count = contacts?.filter(c => c.stage === s.value).length || 0;
          return (
            <Card key={s.value} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStageFilter(s.value)}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !contacts?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p>Nenhum contato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(c => {
                  const si = stageInfo(c.stage);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell>{c.company || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{si.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{c.source}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
