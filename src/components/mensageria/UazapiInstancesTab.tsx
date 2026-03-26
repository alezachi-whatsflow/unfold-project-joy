import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import InstanceCard, { type UazapiInstance } from "./InstanceCard";
import UazapiQRCodeModal from "./UazapiQRCodeModal";
import { supabase } from "@/integrations/supabase/client";
import { instanceService } from "@/services/instanceService";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

export default function UazapiInstancesTab() {
  const tenantId = useTenantId();
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [connectInstance, setConnectInstance] = useState<UazapiInstance | null>(null);

  const fetchInstances = async () => {
    setLoading(true);
    let query = supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("provedor", "uazapi")
      .order("api_created_at", { ascending: false, nullsFirst: false });

    // Filter by tenant if available (RLS should handle this, but explicit is safer)
    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { data } = await query;

    if (data) {
      setInstances(data.map((d: any) => ({
        id: d.id,
        instance_name: d.instance_name || d.session_id,
        instance_token: d.instance_token || d.token_api,
        status: d.status,
        qr_code: d.qr_code,
        pair_code: d.pair_code,
        profile_name: d.profile_name,
        profile_pic_url: d.profile_pic_url,
        phone_number: d.phone_number || d.numero,
        is_business: d.is_business || false,
        platform: d.platform,
        current_presence: d.current_presence || "available",
        chatbot_enabled: d.chatbot_enabled || false,
        chatbot_ignore_groups: d.chatbot_ignore_groups ?? true,
        chatbot_stop_keyword: d.chatbot_stop_keyword || "parar",
        chatbot_stop_minutes: d.chatbot_stop_minutes || 60,
        chatbot_stop_when_send: d.chatbot_stop_when_send || 0,
        openai_apikey: d.openai_apikey,
        webhook_url: d.webhook_url || "",
        ultimo_ping: d.ultimo_ping,
        label: d.label,
        session_id: d.session_id,
        provedor: d.provedor,
      })));
    }
    setLoading(false);
  };

  // Subscribe to realtime updates on whatsapp_instances
  useEffect(() => {
    fetchInstances();
    const channel = supabase
      .channel("uazapi-instances-rt")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "whatsapp_instances",
      }, () => {
        fetchInstances();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Informe o nome da instância.");
      return;
    }
    setCreating(true);
    try {
      if (!tenantId) { toast.error("Tenant não encontrado."); return; }
      await instanceService.create({ name: newName.trim(), tenantId });
      toast.success("Instância criada! Clique em Conectar para escanear o QR Code.");
      setShowCreate(false);
      setNewName("");
      fetchInstances();
    } catch (err: any) {
      toast.error("Erro ao criar: " + (err?.message || "Erro desconhecido"));
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await instanceService.syncAll();
      toast.success("Instâncias sincronizadas!");
    } catch {
      toast.error("Erro ao sincronizar.");
    }
    fetchInstances();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Instâncias uazapi</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={loading} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sincronizar
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" /> Nova Instância
          </Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instances.map((inst) => (
          <InstanceCard
            key={inst.id}
            instance={inst}
            onConnect={() => setConnectInstance(inst)}
            onRefresh={fetchInstances}
            onDelete={fetchInstances}
          />
        ))}
      </div>

      {!loading && instances.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhuma instância uazapi configurada.</p>
          <p className="text-xs mt-1">Clique em "Nova Instância" para criar uma.</p>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Instância uazapi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da instância</Label>
              <Input placeholder="Ex: cobranca-principal" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">O nome será usado como identificador único no servidor.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Criar Instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR/Pair Code Modal */}
      <UazapiQRCodeModal
        instance={connectInstance}
        onClose={() => setConnectInstance(null)}
        onStatusChange={fetchInstances}
      />
    </div>
  );
}
