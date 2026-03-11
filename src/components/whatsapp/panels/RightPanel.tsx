import { useState } from "react";
import { MessageCircle, Phone, MoreVertical, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { Conversation } from "@/data/mockConversations";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import StatusBadge from "../shared/StatusBadge";

interface RightPanelProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RightPanel({ conversation, isOpen, onClose }: RightPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ tags: true, info: true, custom: false });

  const toggleSection = (id: string) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  if (!conversation || !isOpen) return null;
  const c = conversation;
  const isGroup = c.isGroup ?? false;

  const fields = isGroup
    ? [
        { label: "Tipo", value: "Grupo" },
        { label: "Nome do Grupo", value: c.name },
        { label: "ID do Grupo", value: c.phone },
        ...(c.participantCount ? [{ label: "Participantes", value: String(c.participantCount) }] : []),
      ]
    : [
        { label: "Status no funil", value: "Qualificado" },
        { label: "Nome", value: c.name },
        { label: "Telefone", value: c.phone },
        { label: "Email", value: "—" },
        { label: "CPF/CNPJ", value: "—" },
      ];

  return (
    <div
      className="right-panel-wa h-full flex flex-col overflow-y-auto shrink-0"
      style={{
        width: 320,
        backgroundColor: "var(--wa-bg-panel)",
        borderLeft: "1px solid var(--wa-border)",
      }}
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>
          {isGroup ? "Informações do grupo" : "Informações do contato"}
        </span>
        <button onClick={onClose} aria-label="Fechar painel">
          <X size={18} style={{ color: "var(--wa-text-secondary)" }} />
        </button>
      </div>

      {/* Contact Info */}
      <div className="flex flex-col items-center py-6" style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={64} isOnline={c.isOnline} />
        <p className="text-base font-semibold mt-3" style={{ color: "var(--wa-text-primary)" }}>{c.name}</p>
        <p className="text-[13px]" style={{ color: "var(--wa-text-secondary)" }}>{c.phone}</p>
        <div className="flex gap-3 mt-4">
          {[MessageCircle, Phone, MoreVertical].map((Icon, i) => (
            <button
              key={i}
              className="rounded-full flex items-center justify-center transition-colors"
              style={{ width: 40, height: 40, backgroundColor: "var(--wa-bg-input)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-border-input)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-bg-input)")}
              aria-label="action"
            >
              <Icon size={18} style={{ color: "var(--wa-text-primary)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Tags & Status Section */}
      <div style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <button onClick={() => toggleSection("tags")} className="w-full flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>Tags e Status</span>
          {openSections.tags ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
        </button>
        {openSections.tags && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {c.tags.map((tag, i) => <TagBadge key={i} label={tag.label} color={tag.color} />)}
              <button className="rounded-full flex items-center justify-center" style={{ width: 18, height: 18, border: "1px dashed var(--wa-border-input)" }} aria-label="Adicionar tag">
                <Plus size={10} style={{ color: "var(--wa-text-secondary)" }} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>Ticket:</span>
              <StatusBadge status={c.status} />
            </div>
            {c.assignedTo && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>Atendente:</span>
                <div className="flex items-center gap-1">
                  <WaAvatar initials={c.assignedTo.split(" ").map(w => w[0]).join("")} color="var(--wa-green)" size={20} />
                  <span className="text-xs" style={{ color: "var(--wa-text-primary)" }}>{c.assignedTo}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Info Section */}
      <div style={{ borderBottom: "1px solid var(--wa-border)" }}>
        <button onClick={() => toggleSection("info")} className="w-full flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>
            {isGroup ? "Informações do Grupo" : "Informações do Lead"}
          </span>
          {openSections.info ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
        </button>
        {openSections.info && (
          <div className="px-4 pb-3 space-y-2">
            {fields.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase" style={{ color: "var(--wa-text-tertiary)" }}>{f.label}</span>
                <span className="text-sm" style={{ color: "var(--wa-text-primary)" }}>{f.value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase" style={{ color: "var(--wa-text-tertiary)" }}>Anotações</span>
              <textarea
                className="w-full bg-transparent border rounded text-sm resize-none outline-none px-2 py-1"
                style={{ borderColor: "var(--wa-border-input)", color: "var(--wa-text-primary)", minHeight: 60 }}
                placeholder="Adicionar notas..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div>
        <button onClick={() => toggleSection("custom")} className="w-full flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>Campos Personalizados</span>
          {openSections.custom ? <ChevronUp size={16} style={{ color: "var(--wa-text-secondary)" }} /> : <ChevronDown size={16} style={{ color: "var(--wa-text-secondary)" }} />}
        </button>
        {openSections.custom && (
          <div className="px-4 pb-3">
            <button className="flex items-center gap-1 text-xs" style={{ color: "var(--wa-green)" }}>
              <Plus size={14} /> Adicionar campo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
