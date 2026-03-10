import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ConnectionCard, { type WhatsAppInstance } from "./ConnectionCard";
import NewConnectionModal from "./NewConnectionModal";
import QRCodeModal from "./QRCodeModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WhatsAppConnectionsTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);

  const fetchInstances = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .order("criado_em", { ascending: false });
    if (data) {
      setInstances(
        data.map((d: any) => ({
          id: d.id,
          session_id: d.session_id,
          label: d.label,
          numero: d.numero,
          provedor: d.provedor,
          status: d.status,
          webhook_url: d.webhook_url,
          ultimo_ping: d.ultimo_ping,
          uso_principal: d.uso_principal,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchInstances(); }, []);

  const handleSaveNew = async (inst: WhatsAppInstance & { token_api?: string; server_url?: string; instance_id_api?: string; client_token?: string }) => {
    const { error } = await supabase.from("whatsapp_instances").insert({
      session_id: inst.session_id,
      label: inst.label,
      provedor: inst.provedor,
      status: "qr_pending",
      webhook_url: inst.webhook_url,
      uso_principal: inst.uso_principal,
      token_api: inst.token_api || "",
      instance_id_api: inst.instance_id_api || "",
      server_url: inst.server_url || null,
      client_token: inst.client_token || "",
    });
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Conexão criada!");
    setShowNewModal(false);
    fetchInstances();
  };

  const handleDisconnect = async (id: string) => {
    await supabase.from("whatsapp_instances").update({ status: "disconnected", numero: null }).eq("id", id);
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "disconnected" as const, numero: null } : i))
    );
  };

  const handleDelete = async (id: string) => {
    await supabase.from("whatsapp_instances").delete().eq("id", id);
    setInstances((prev) => prev.filter((i) => i.id !== id));
    toast.success("Conexão excluída");
  };

  const handleStatusChange = (id: string, status: string, numero?: string) => {
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: status as any, numero: numero || i.numero } : i))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conexões WhatsApp</h2>
        <Button onClick={() => setShowNewModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" /> Nova Conexão
        </Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instances.map((inst) => (
          <ConnectionCard
            key={inst.id}
            instance={inst}
            onQrCode={() => setQrInstance(inst)}
            onDisconnect={() => handleDisconnect(inst.id)}
            onDelete={() => handleDelete(inst.id)}
          />
        ))}
      </div>

      {!loading && instances.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhuma conexão configurada.</p>
        </div>
      )}

      <NewConnectionModal open={showNewModal} onClose={() => setShowNewModal(false)} onSave={handleSaveNew} />
      <QRCodeModal instance={qrInstance} onClose={() => setQrInstance(null)} onStatusChange={handleStatusChange} />
    </div>
  );
}
