import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Instance {
  id: string;
  label: string;
  instance_name: string | null;
  status: string;
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
    supabase
      .from("whatsapp_instances")
      .select("id, label, instance_name, status")
      .eq("status", "connected")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setInstances(data);
          setSelectedInstance(data[0].instance_name || "");
        } else {
          setInstances([]);
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

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("uazapi-proxy", {
        body: {
          instanceName: selectedInstance,
          path: "/send/text",
          method: "POST",
          body: { number: cleanPhone, text },
        },
      });

      if (error) throw error;

      toast.success("Mensagem enviada!");
      const jid = `${cleanPhone}@s.whatsapp.net`;
      onConversationStarted(jid);
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
        className="rounded-xl shadow-2xl w-[380px] flex flex-col overflow-hidden"
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
              className="rounded-lg px-3 py-2 text-sm outline-none"
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
              className="rounded-lg px-3 py-2 text-sm outline-none"
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
              className="rounded-lg px-3 py-2 text-sm outline-none"
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
              className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{
                backgroundColor: "var(--wa-bg-chat)",
                color: "var(--wa-text-primary)",
                border: "1px solid var(--wa-border)",
              }}
            />
          ) : (
            <div
              className="rounded-lg px-3 py-2 text-xs leading-relaxed"
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
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
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
