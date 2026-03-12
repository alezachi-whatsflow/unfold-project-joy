import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenants } from "@/hooks/useUserTenants";
import { useLicenseLimits } from "@/hooks/useLicenseLimits";
import { LicenseLimitModal } from "@/components/license/LicenseLimitModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Wifi, WifiOff, Smartphone, Monitor, Loader2 } from "lucide-react";

export default function WaConnectionsContent() {
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const queryClient = useQueryClient();
  const { data: limits } = useLicenseLimits(tenantId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [limitModal, setLimitModal] = useState(false);
  const [limitType, setLimitType] = useState('');
  const [form, setForm] = useState({ display_name: '', phone_number: '', type: 'web' });

  const { data: connections, isLoading } = useQuery({
    queryKey: ['wa-connections', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from('whatsapp_connections').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createConnection = useMutation({
    mutationFn: async () => {
      if (!tenantId || !limits) throw new Error('Sem dados');
      if (form.type === 'web' && limits.currentDevicesWeb >= limits.maxDevicesWeb) {
        setLimitType('Dispositivos Web');
        setLimitModal(true);
        throw new Error('LIMIT');
      }
      if (form.type === 'meta' && limits.currentDevicesMeta >= limits.maxDevicesMeta) {
        setLimitType('Dispositivos Meta');
        setLimitModal(true);
        throw new Error('LIMIT');
      }
      const { error } = await supabase.from('whatsapp_connections').insert({ ...form, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conexão criada!');
      queryClient.invalidateQueries({ queryKey: ['wa-connections'] });
      queryClient.invalidateQueries({ queryKey: ['license-limits'] });
      setDialogOpen(false);
      setForm({ display_name: '', phone_number: '', type: 'web' });
    },
    onError: (e: any) => { if (e.message !== 'LIMIT') toast.error(e.message); },
  });

  const webConns = connections?.filter((c: any) => c.type === 'web') || [];
  const metaConns = connections?.filter((c: any) => c.type === 'meta') || [];

  const statusIcon = (s: string) => s === 'connected' ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />;
  const statusColor = (s: string) => s === 'connected' ? 'default' : s === 'pending' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conexões WhatsApp</h2>
          <p className="text-muted-foreground text-sm">Gerencie seus dispositivos conectados.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Adicionar Conexão</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conexão WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web"><div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> API Web</div></SelectItem>
                    <SelectItem value="meta"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Meta Business</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nome da Conexão</Label><Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} /></div>
              <div><Label>Número</Label><Input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="+55 11 99999-9999" /></div>
              {limits && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <p>Limites: Web {limits.currentDevicesWeb}/{limits.maxDevicesWeb} | Meta {limits.currentDevicesMeta}/{limits.maxDevicesMeta}</p>
                </div>
              )}
              <Button className="w-full" onClick={() => createConnection.mutate()} disabled={!form.display_name || createConnection.isPending}>
                {createConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Conexão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><Monitor className="h-5 w-5" /> API Web ({webConns.length}/{limits?.maxDevicesWeb || 0})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {webConns.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{c.display_name}</p>
                      {statusIcon(c.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{c.phone_number || 'Sem número'}</p>
                    <Badge variant={statusColor(c.status) as any} className="mt-2">{c.status}</Badge>
                  </CardContent>
                </Card>
              ))}
              {!webConns.length && <p className="text-sm text-muted-foreground col-span-full">Nenhuma conexão Web</p>}
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><Smartphone className="h-5 w-5" /> Meta Business ({metaConns.length}/{limits?.maxDevicesMeta || 0})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metaConns.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{c.display_name}</p>
                      {statusIcon(c.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{c.phone_number || 'Sem número'}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={statusColor(c.status) as any}>{c.status}</Badge>
                      {c.quality_rating && <Badge variant="outline">{c.quality_rating}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!metaConns.length && <p className="text-sm text-muted-foreground col-span-full">Nenhuma conexão Meta</p>}
            </div>
          </div>
        </div>
      )}

      <LicenseLimitModal open={limitModal} onOpenChange={setLimitModal} resourceType={limitType} />
    </div>
  );
}