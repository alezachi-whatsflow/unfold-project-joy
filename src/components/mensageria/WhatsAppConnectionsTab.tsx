import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ConnectionCard, { type WhatsAppInstance } from "./ConnectionCard";
import NewConnectionModal from "./NewConnectionModal";
import QRCodeModal from "./QRCodeModal";

const MOCK_INSTANCES: WhatsAppInstance[] = [
  {
    id: "1",
    session_id: "suporte-whatsflow",
    label: "Suporte Whatsflow",
    numero: "+55 43 99999-0001",
    provedor: "zapi",
    status: "connected",
    webhook_url: "https://seudominio.com/webhook/suporte-whatsflow",
    ultimo_ping: new Date(Date.now() - 2 * 60000).toISOString(),
    uso_principal: "suporte",
  },
  {
    id: "2",
    session_id: "cobranca-pioneira",
    label: "Cobrança - Pioneira",
    numero: null,
    provedor: "evolution",
    status: "qr_pending",
    webhook_url: "https://seudominio.com/webhook/cobranca-pioneira",
    ultimo_ping: null,
    uso_principal: "cobranca",
  },
  {
    id: "3",
    session_id: "prospeccao-leads",
    label: "Prospecção de Leads",
    numero: null,
    provedor: "uazapi",
    status: "disconnected",
    webhook_url: "https://seudominio.com/webhook/prospeccao-leads",
    ultimo_ping: new Date(Date.now() - 45 * 60000).toISOString(),
    uso_principal: "prospeccao",
  },
];

export default function WhatsAppConnectionsTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>(MOCK_INSTANCES);
  const [showNewModal, setShowNewModal] = useState(false);
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);

  const handleSaveNew = (inst: WhatsAppInstance) => {
    setInstances((prev) => [...prev, inst]);
    setShowNewModal(false);
  };

  const handleDisconnect = (id: string) => {
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "disconnected" as const, numero: null } : i))
    );
  };

  const handleDelete = (id: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conexões WhatsApp</h2>
        <Button onClick={() => setShowNewModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" /> Nova Conexão
        </Button>
      </div>

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

      {instances.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhuma conexão configurada.</p>
        </div>
      )}

      <NewConnectionModal open={showNewModal} onClose={() => setShowNewModal(false)} onSave={handleSaveNew} />
      <QRCodeModal instance={qrInstance} onClose={() => setQrInstance(null)} />
    </div>
  );
}
