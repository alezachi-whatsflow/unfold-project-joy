import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLicenseLimits } from "@/hooks/useLicenseLimits";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, AlertTriangle, Play, Copy, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Plus, Wifi, WifiOff, Smartphone, Monitor, Loader2 } from "lucide-react";

export default function WaConnectionsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // We fetch account manually since phase 4 moved to account_id
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('account_id').eq('id', user.id).single();
      return data;
    },
    enabled: !!user
  });
  
  const accountId = profile?.account_id;
  const { data: limits } = useLicenseLimits(accountId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState({ display_name: '', phone_number: '', type: 'web' });
  const [createdConnId, setCreatedConnId] = useState<string | null>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['wa-connections', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      // Try to fetch by account_id, fallback to tenant_id if schema is mixed up
      const { data, error } = await supabase.from('whatsapp_connections').select('*').eq('account_id', accountId).order('created_at', { ascending: false });
      if (error) {
        // Fallback for older schema just in case
        const res = await supabase.from('whatsapp_connections').select('*').eq('tenant_id', accountId).order('created_at', { ascending: false });
        if (res.error) throw res.error;
        return res.data || [];
      }
      return data || [];
    },
    enabled: !!accountId,
  });

  const createConnection = useMutation({
    mutationFn: async () => {
      if (!accountId || !limits) throw new Error('Sem dados');
      
      const isWeb = form.type === 'web';
      if (isWeb && limits.currentDevicesWeb >= limits.maxDevicesWeb) throw new Error('LIMIT_WEB');
      if (!isWeb && limits.currentDevicesMeta >= limits.maxDevicesMeta) throw new Error('LIMIT_META');
      
      const payload = { 
        ...form, 
        account_id: accountId,
        tenant_id: accountId, // Keep for backwards compatibility
        status: 'pending' 
      };
      
      const { data, error } = await supabase.from('whatsapp_connections').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Conexão configurada aguardando ativação.');
      queryClient.invalidateQueries({ queryKey: ['wa-connections'] });
      setCreatedConnId(data.id);
      setWizardStep(3); // Go to step 3 to show webhook
    },
    onError: (e: any) => { 
      if (e.message === 'LIMIT_WEB') toast.error("Limite de conexões Web atingido.");
      else if (e.message === 'LIMIT_META') toast.error("Limite de conexões Meta atingido.");
      else toast.error(e.message);
    },
  });

  const webConns = connections?.filter((c: any) => c.type === 'web') || [];
  const metaConns = connections?.filter((c: any) => c.type === 'meta') || [];

  const navigateToStep2 = () => {
    if (!form.display_name) return toast.error("Preencha o nome");
    setWizardStep(2);
  };

  const statusColor = (s: string) => s === 'connected' ? 'default' : s === 'pending' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conexões WhatsApp</h2>
          <p className="text-muted-foreground text-sm">Gerencie seus dispositivos conectados (Web ou Oficial API).</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setWizardStep(1);
            setForm({ display_name: '', phone_number: '', type: 'web' });
            setCreatedConnId(null);
          }
        }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Adicionar Conexão</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
            </DialogHeader>

            {/* STEP 1 */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-2">
                <div>
                  <Label>Tipo de Conexão</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web"><div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> API Web (QR Code)</div></SelectItem>
                      <SelectItem value="meta"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Meta Business (Oficial)</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nome Interno</Label><Input className="mt-1" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Ex: Suporte 1" /></div>
                <div><Label>Telefone (Opcional visual)</Label><Input className="mt-1" value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="+55 11 99999-9999" /></div>
                
                {limits && (
                  <div className="text-xs p-3 bg-secondary/50 rounded-lg border flex gap-4 mt-2">
                    <span className="flex items-center gap-1.5"><Monitor className="h-3 w-3 text-white/50" /> Web: {limits.currentDevicesWeb}/{limits.maxDevicesWeb}</span>
                    <span className="flex items-center gap-1.5"><Smartphone className="h-3 w-3 text-white/50" /> Meta: {limits.currentDevicesMeta}/{limits.maxDevicesMeta}</span>
                  </div>
                )}
                
                <DialogFooter className="pt-2">
                  <Button onClick={navigateToStep2} className="w-full">Próximo <ArrowRight className="h-4 w-4 ml-2"/></Button>
                </DialogFooter>
              </div>
            )}

            {/* STEP 2 */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-2">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 text-sm text-primary">
                  {form.type === 'web' ? (
                     <p><b>Aviso Web API:</b> Conexões via QRCode podem sofrer instabilidades em atualizações do WhatsApp. Tenha seu celular próximo.</p>
                  ) : (
                     <p><b>Requisitos Meta:</b> Você precisará de um App no Meta for Developers e criar um Token Permanente para anexar à configuração na próxima tela.</p>
                  )}
                </div>

                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(1)}><ArrowLeft className="h-4 w-4 mr-2"/> Voltar</Button>
                  <Button className="flex-1" onClick={() => createConnection.mutate()} disabled={createConnection.isPending}>
                    {createConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirmar Criação
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* STEP 3 */}
            {wizardStep === 3 && createdConnId && (
              <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                  <Wifi className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-bold">Configuração Finalizada!</h3>
                {form.type === 'meta' ? (
                  <div className="text-sm p-4 text-left border rounded-lg bg-black/20 space-y-3">
                    <p className="text-muted-foreground">Configure seu Webhook no Meta for Developers com a URL abaixo:</p>
                    <div className="flex bg-black p-2 rounded items-center gap-2">
                      <code className="flex-1 text-xs text-emerald-400 break-all">{window.location.origin}/api/webhooks/{accountId}/{createdConnId}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => toast.success("Copiado!")}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm p-4 border rounded-lg bg-black/20 text-muted-foreground">
                    Na lista de conexões clique em "Conectar" para escanear o QR Code em seu WhatsApp.
                  </div>
                )}
                <DialogFooter className="pt-2">
                  <Button onClick={() => setDialogOpen(false)} className="w-full">Concluir</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><Monitor className="h-5 w-5 opacity-70" /> Dispositivos Web ({webConns.length}/{limits?.maxDevicesWeb || 0})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {webConns.map((c: any) => (
                <Card key={c.id} className="border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-white">{c.display_name}</p>
                      {c.status === 'connected' ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-rose-500" />}
                    </div>
                    <p className="text-xs text-white/50 mb-3">{c.phone_number || 'Sem número'}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant={statusColor(c.status) as any}>{c.status}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs border border-white/5"><Play className="h-3 w-3 mr-1" /> Conectar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!webConns.length && <p className="text-sm text-muted-foreground col-span-full">Nenhuma conexão Web</p>}
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2 mt-8"><Smartphone className="h-5 w-5 opacity-70" /> Dispositivos Meta ({metaConns.length}/{limits?.maxDevicesMeta || 0})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metaConns.map((c: any) => (
                <Card key={c.id} className="border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-white">{c.display_name}</p>
                      {c.status === 'connected' ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-rose-500" />}
                    </div>
                    <p className="text-xs text-white/50 mb-3">{c.phone_number || 'Sem número configurado'}</p>
                    <div className="flex gap-2">
                      <Badge variant={statusColor(c.status) as any}>{c.status}</Badge>
                      {c.quality_rating && <Badge variant="outline" className="text-[10px]">{c.quality_rating}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!metaConns.length && <p className="text-sm text-muted-foreground col-span-full">Nenhuma conexão Meta Oficial</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}