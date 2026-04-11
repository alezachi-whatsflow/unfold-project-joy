import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Phone, MoreVertical, ChevronDown, ChevronUp, X, GitBranch, Loader2, Pencil, Check, Save } from "lucide-react";
import type { Conversation } from "@/data/mockConversations";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import StatusBadge from "../shared/StatusBadge";
import { usePipelines } from "@/hooks/usePipelines";
import { useTenantId } from "@/hooks/useTenantId";
import { useNegocios } from "@/hooks/useNegocios";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface RightPanelProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onNameUpdated?: () => void;
}

export default function RightPanel({ conversation, isOpen, onClose, onNameUpdated }: RightPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ tags: true, info: true, pipeline: true });
  const tenantId = useTenantId();
  const { pipelines } = usePipelines(tenantId);
  const { createNegocio } = useNegocios(tenantId);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Editable fields
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCpfCnpj, setEditCpfCnpj] = useState("");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [savingName, setSavingName] = useState(false);

  const toggleSection = (id: string) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  // Reset edit state when conversation changes
  useEffect(() => {
    setEditingName(false);
    if (conversation) {
      setEditName(conversation.name || "");
      setEditEmail("");
      setEditCpfCnpj("");
      setEditEmpresa("");

      // Load email/cpf/empresa from lead or customer
      const chatId = conversation.id.includes("::") ? conversation.id.split("::").slice(1).join("::") : conversation.id;
      const instName = conversation.instanceName || (conversation.id.includes("::") ? conversation.id.split("::")[0] : "");
      let q = supabase.from("whatsapp_leads").select("customer_id").eq("chat_id", chatId);
      if (instName) q = q.eq("instance_name", instName);
      q.maybeSingle().then(({ data }) => {
        if (data?.customer_id) {
          supabase.from("customers").select("email, cpf_cnpj, empresa").eq("id", data.customer_id).maybeSingle().then(({ data: cust }) => {
            if (cust) {
              setEditEmail(cust.email || "");
              setEditCpfCnpj(cust.cpf_cnpj || "");
              setEditEmpresa((cust as any).empresa || "");
            }
          });
        }
      });
    }
  }, [conversation?.id]);

  const handleSaveName = useCallback(async () => {
    if (!conversation || !editName.trim()) return;
    setSavingName(true);

    const chatId = conversation.id.includes("::") ? conversation.id.split("::").slice(1).join("::") : conversation.id;
    const instName = conversation.instanceName || (conversation.id.includes("::") ? conversation.id.split("::")[0] : "");

    try {
      const { data, error } = await supabase.functions.invoke("update-contact-name", {
        body: {
          chat_id: chatId,
          instance_name: instName,
          new_name: editName.trim(),
          email: editEmail.trim() || undefined,
          cpf_cnpj: editCpfCnpj.trim() || undefined,
          empresa: editEmpresa.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Nome atualizado: ${editName.trim()}`);
      setEditingName(false);
      onNameUpdated?.();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSavingName(false);
    }
  }, [conversation, editName, editEmail, editCpfCnpj, editEmpresa, onNameUpdated]);

  if (!conversation || !isOpen) return null;
  const c = conversation;
  const isGroup = c.isGroup ?? false;

  const handleSendToPipeline = async (pipelineId: string, pipelineName: string) => {
    if (!tenantId) return;
    setSendingTo(pipelineId);
    try {
      await createNegocio({
        titulo: `Lead: ${editName || c.name}`,
        status: "prospeccao",
        origem: "whatsapp",
        cliente_nome: editName || c.name,
        pipeline_id: pipelineId,
        notas: `Telefone: ${c.phone}\nOrigem: Caixa de Entrada`,
        valor_total: 0,
        valor_liquido: 0,
        probabilidade: 50,
        tags: ["inbox"],
      } as any);
      toast.success(`Negocio criado em "${pipelineName}"!`);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="right-panel-wa h-full flex flex-col overflow-y-auto shrink-0 msg-right-panel" style={{ width: 320 }}>
      {/* Close button */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>
          {isGroup ? "Informacoes do grupo" : "Informacoes do contato"}
        </span>
        <button onClick={onClose} aria-label="Fechar painel">
          <X size={18} style={{ color: "var(--wa-text-secondary)" }} />
        </button>
      </div>

      {/* Contact Header */}
      <div className="flex flex-col items-center py-6" style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={64} isOnline={c.isOnline} avatarUrl={c.avatarUrl} />

        {/* Editable name */}
        {editingName ? (
          <div className="flex items-center gap-1 mt-3 px-4 w-full">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm text-center"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSaveName} disabled={savingName}>
              {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setEditingName(false); setEditName(c.name); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-3 group cursor-pointer" onClick={() => !isGroup && setEditingName(true)}>
            <p className="text-base font-semibold" style={{ color: "var(--wa-text-primary)" }}>{editName || c.name}</p>
            {!isGroup && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        )}

        <p className="text-[13px]" style={{ color: "var(--wa-text-secondary)" }}>{c.phone}</p>

        <div className="flex gap-3 mt-4">
          {[MessageCircle, Phone, MoreVertical].map((Icon, i) => (
            <button
              key={i}
              className="rounded-full flex items-center justify-center transition-colors"
              style={{ width: 40, height: 40, backgroundColor: "var(--wa-bg-input)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-border-input)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-bg-input)")}
            >
              <Icon size={18} style={{ color: "var(--wa-text-primary)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Send to Pipeline */}
      {!isGroup && pipelines.length > 0 && (
        <div style={{ borderBottom: "1px solid var(--wa-border)" }}>
          <button onClick={() => toggleSection("pipeline")} className="w-full flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--wa-text-primary)" }}>
              <GitBranch size={14} /> Enviar para Pipeline
            </span>
            {openSections.pipeline ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
          </button>
          {openSections.pipeline && (
            <div className="px-4 pb-3 space-y-1.5">
              {pipelines.map(p => {
                const isSending = sendingTo === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSendToPipeline(p.id, p.name)}
                    disabled={isSending}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors hover:bg-muted"
                    style={{ border: "1px solid var(--wa-border)" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <GitBranch size={12} /> {p.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.stages?.length || 0} etapas</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tags e Status */}
      <div style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <button onClick={() => toggleSection("tags")} className="w-full flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>Tags e Status</span>
          {openSections.tags ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
        </button>
        {openSections.tags && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map((tag, i) => <TagBadge key={i} label={tag.label} color={tag.color} />)}
              {c.tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
            </div>
            <div className="flex gap-3 text-xs">
              <span>Ticket: <StatusBadge status={c.isTicketOpen ? "ABERTO" : "FECHADO"} /></span>
            </div>
            {c.assignedTo && (
              <div className="text-xs text-muted-foreground">
                Atendente: <span className="font-mono text-[10px]">{c.assignedTo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Info — Editable */}
      <div>
        <button onClick={() => toggleSection("info")} className="w-full flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>Informacoes do Lead</span>
          {openSections.info ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
        </button>
        {openSections.info && (
          <div className="px-4 pb-4 space-y-3">
            {isGroup ? (
              <>
                <InfoField label="Tipo" value="Grupo" />
                <InfoField label="Nome do Grupo" value={c.name} />
                <InfoField label="ID do Grupo" value={c.phone} />
              </>
            ) : (
              <>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm mt-0.5"
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Empresa</Label>
                  <Input
                    value={editEmpresa}
                    onChange={(e) => setEditEmpresa(e.target.value)}
                    className="h-8 text-sm mt-0.5"
                    placeholder="Nome da empresa"
                  />
                </div>
                <InfoField label="Telefone" value={c.phone} />
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="h-8 text-sm mt-0.5"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">CPF/CNPJ</Label>
                  <Input
                    value={editCpfCnpj}
                    onChange={(e) => setEditCpfCnpj(e.target.value)}
                    className="h-8 text-sm mt-0.5"
                    placeholder="000.000.000-00"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleSaveName}
                  disabled={savingName || !editName.trim()}
                >
                  {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar Alterações
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase" style={{ color: "var(--wa-text-tertiary)" }}>{label}</p>
      <p className="text-sm" style={{ color: "var(--wa-text-primary)" }}>{value || "—"}</p>
    </div>
  );
}
