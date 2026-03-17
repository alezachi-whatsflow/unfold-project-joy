import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, Flag, Search } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';

export default function NexusFeatureFlags() {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: '', description: '', is_global: false, default_value: false });
  const [search, setSearch] = useState('');

  useEffect(() => { loadFlags(); }, []);

  async function loadFlags() {
    setLoading(true);
    const { data } = await supabase.from('nexus_feature_flags').select('*').order('created_at', { ascending: false });
    setFlags(data || []);
    setLoading(false);
  }

  async function toggleFlag(flag: any) {
    const newValue = !flag.default_value;
    await supabase.from('nexus_feature_flags').update({ default_value: newValue }).eq('id', flag.id);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'feature_flag_change', target_entity: flag.flag_key,
      old_value: { value: flag.default_value }, new_value: { value: newValue },
    });
    toast({ title: `Flag ${flag.flag_key} ${newValue ? 'ativada' : 'desativada'}` });
    loadFlags();
  }

  async function createFlag() {
    if (!newFlag.flag_key.trim()) return;
    await supabase.from('nexus_feature_flags').insert(newFlag);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'feature_flag_change', target_entity: newFlag.flag_key,
    });
    toast({ title: 'Flag criada' });
    setNewFlag({ flag_key: '', description: '', is_global: false, default_value: false });
    setShowCreate(false);
    loadFlags();
  }

  const filtered = search.trim()
    ? flags.filter((f) => f.flag_key.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase()))
    : flags;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6" /> Feature Flags
          </h1>
          <p className="text-sm text-muted-foreground">{flags.length} flags · Controle global e por licença</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Flag
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">Nenhuma feature flag encontrada</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((flag) => (
            <Card key={flag.id} className="bg-card/50 border-border/50">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground">{flag.flag_key}</code>
                    {flag.is_global && <Badge className="text-[10px] bg-blue-500/20 text-blue-400">Global</Badge>}
                    <Badge className={`text-[10px] ${flag.default_value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {flag.default_value ? 'ON' : 'OFF'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{flag.description || 'Sem descrição'}</p>
                </div>
                <Switch checked={flag.default_value} onCheckedChange={() => toggleFlag(flag)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chave (flag_key)</Label>
              <Input value={newFlag.flag_key} onChange={(e) => setNewFlag({ ...newFlag, flag_key: e.target.value })} placeholder="ex: enable_ai_v2" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newFlag.description} onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Global (afeta todas as licenças)</Label>
              <Switch checked={newFlag.is_global} onCheckedChange={(v) => setNewFlag({ ...newFlag, is_global: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Valor padrão</Label>
              <Switch checked={newFlag.default_value} onCheckedChange={(v) => setNewFlag({ ...newFlag, default_value: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={createFlag}>Criar Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
