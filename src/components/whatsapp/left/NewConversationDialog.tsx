import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Instance {
  id: string;
  label: string;
  instance_name: string | null;
  status: string;
  type: "uazapi" | "meta_cloud";
  phone_number_id?: string;
}

const QUICK_MESSAGES = [
  { label: "Saudação padrão", text: "Olá! Tudo bem? Sou da equipe de atendimento. Como posso ajudá-lo(a) hoje?" },
  { label: "Boas-vindas", text: "Olá! Seja muito bem-vindo(a)! Estou à disposição para ajudar no que precisar. 😊" },
  { label: "Retorno de contato", text: "Olá! Estou entrando em contato conforme combinado. Podemos conversar agora?" },
  { label: "Apresentação comercial", text: "Olá! Meu nome é [seu nome] e gostaria de apresentar nossos serviços. Posso falar um momento?" },
  { label: "Follow-up", text: "Olá! Passando para saber se teve a oportunidade de analisar nossa proposta. Tem alguma dúvida?" },
  { label: "Mensagem personalizada", text: "" },
];

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onConversationStarted: (jid: string) => void;
}

export default function NewConversationDialog({ open, onClose, onConversationStarted }: NewConversationDialogProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;

    const tenantId = localStorage.getItem("whatsflow_default_tenant_id");
    let instQuery = supabase
      .from("whatsapp_instances")
      .select("id, label, instance_name, status, provedor")
      .eq("status", "connected")
      .neq("provedor", "cloud_api"); // Exclude cloud_api (comes from channel_integrations)
    if (tenantId) instQuery = instQuery.eq("tenant_id", tenantId);

    let metaQuery = supabase
      .from("channel_integrations")
      .select("id, name, phone_number_id, display_phone_number, status, provider")
      .eq("provider", "WABA")
      .eq("status", "active");
    if (tenantId) metaQuery = metaQuery.eq("tenant_id", tenantId);

    Promise.all([instQuery, metaQuery]).then(([legacyRes, metaRes]) => {
      const allInstances: Instance[] = [];

      // Add legacy instances
      (legacyRes.data || []).forEach((inst) => {
        allInstances.push({
          id: inst.id,
          label: inst.label,
          instance_name: inst.instance_name,
          status: inst.status,
          type: "uazapi",
        });
      });

      // Add Meta Cloud API instances
      (metaRes.data || []).forEach((ch) => {
        allInstances.push({
          id: ch.id,
          label: `${ch.name}${ch.display_phone_number ? ` (${ch.display_phone_number})` : ""}`,
          instance_name: ch.phone_number_id,
          status: ch.status,
          type: "meta_cloud",
          phone_number_id: ch.phone_number_id,
        });
      });

      setInstances(allInstances);
      if (allInstances.length > 0) {
        setSelectedInstance(allInstances[0].instance_name || "");
      }
    });
  }, [open]);

  const handleSend = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Informe um número válido (com DDD)");
      return;
    }
    if (!selectedInstance) {
      toast.error("Selecione um dispositivo conectado");
      return;
    }

    const template = QUICK_MESSAGES[selectedTemplate];
    const text = template.text || customMessage;
    if (!text.trim()) {
      toast.error("Escreva ou selecione uma mensagem");
      return;
    }

    const instance = instances.find((i) => i.instance_name === selectedInstance);
    if (!instance) {
      toast.error("Dispositivo não encontrado");
      return;
    }

    setSending(true);
    try {
      if (instance.type === "meta_cloud") {
        // Send via Meta Cloud API
        const { error } = await supabase.functions.invoke("meta-send-message", {
          body: {
            phone_number_id: instance.phone_number_id,
            to: cleanPhone,
            text,
          },
        });
        if (error) throw error;
      } else {
        // Send via legacy uazapi
        const { error } = await supabase.functions.invoke("uazapi-proxy", {
          body: {
            instanceName: selectedInstance,
            path: "/send/text",
            method: "POST",
            body: { number: cleanPhone, text },
          },
        });
        if (error) throw error;
      }

      toast.success("Mensagem enviada!");
      const jid = `${cleanPhone}@s.whatsapp.net`;
      const compositeKey = `${selectedInstance}::${jid}`;

      // Auto-assign to current user (goes to "Em Atendimento", not "Fila")
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tenantId = localStorage.getItem("whatsflow_default_tenant_id");
          await supabase.from("whatsapp_leads").upsert({
            chat_id: jid,
            instance_name: selectedInstance,
            lead_name: cleanPhone,
            assigned_attendant_id: user.id,
            lead_status: "open",
            is_ticket_open: true,
            tenant_id: tenantId,
          }, { onConflict: "instance_name,chat_id" });
        }
      } catch (e) {
        console.warn("Auto-assign failed:", e);
      }

      onConversationStarted(compositeKey);
      onClose();
      setPhone("");
      setCustomMessage("");
      setSelectedTemplate(0);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const currentTemplate = QUICK_MESSAGES[selectedTemplate];
  const isCustom = currentTemplate.text === "";

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-16" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-[380px] flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--wa-bg-panel)", border: "1px solid var(--wa-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "var(--wa-bg-header)" }}>
          <span className="font-semibold text-sm" style={{ color: "var(--wa-text-primary)" }}>Nova conversa</span>
          <button onClick={onClose} style={{ color: "var(--wa-text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Instance selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--wa-text-secondary)" }}>Dispositivo</label>
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-primary)",
                border: "1px solid var(--wa-border)",
              }}
            >
              {instances.length === 0 && <option value="">Nenhum dispositivo conectado</option>}
              {instances.map((inst) => (
                <option key={inst.id} value={inst.instance_name || ""}>
                  {inst.label} {inst.instance_name ? `(${inst.instance_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Phone input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--wa-text-secondary)" }}>Número do cliente</label>
            <input
              type="tel"
              placeholder="5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-primary)",
                border: "1px solid var(--wa-border)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>
              Formato: código do país + DDD + número (ex: 5511999999999)
            </span>
          </div>

          {/* Template selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--wa-text-secondary)" }}>Mensagem inicial</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(Number(e.target.value))}
              className="px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-primary)",
                border: "1px solid var(--wa-border)",
              }}
            >
              {QUICK_MESSAGES.map((msg, i) => (
                <option key={i} value={i}>{msg.label}</option>
              ))}
            </select>
          </div>

          {/* Message preview or custom input */}
          {isCustom ? (
            <textarea
              placeholder="Digite sua mensagem..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="px-3 py-2 text-sm outline-none resize-none"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-primary)",
                border: "1px solid var(--wa-border)",
              }}
            />
          ) : (
            <div
              className="px-3 py-2 text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-secondary)",
                border: "1px solid var(--wa-border)",
              }}
            >
              {currentTemplate.text}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !selectedInstance}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--wa-green)", color: "#fff" }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? "Enviando..." : "Iniciar conversa"}
          </button>
        </div>
      </div>
    </div>
  );
}
