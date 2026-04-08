import { useState } from "react";
import { Headphones, ListOrdered, UsersRound, CheckCircle2, Filter } from "lucide-react";
import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout";

type InboxFilter = "atendimento" | "fila" | "grupos" | "finalizados";

const INBOX_TABS: { id: InboxFilter; label: string; icon: React.ElementType; color: string }[] = [
  { id: "atendimento", label: "Em atendimento", icon: Headphones, color: "#0E8A5C" },
  { id: "fila",        label: "Fila",           icon: ListOrdered, color: "#E8A84A" },
  { id: "grupos",      label: "Grupos",         icon: UsersRound,  color: "#5B9EF7" },
  { id: "finalizados", label: "Finalizados",    icon: CheckCircle2, color: "#A09888" },
];

export default function InboxTab() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("atendimento");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px",
        borderBottom: "1px solid var(--inbox-border, #E8E5DF)",
        background: "var(--inbox-surface, #FFFFFF)",
        flexShrink: 0,
      }}>
        {INBOX_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999,
                fontSize: 11, fontWeight: isActive ? 600 : 500,
                background: isActive ? `${tab.color}14` : "transparent",
                color: isActive ? tab.color : "var(--inbox-text-muted, #A09888)",
                border: isActive ? `1px solid ${tab.color}40` : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}

        {/* Filter button */}
        {(
          <button style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            fontSize: 11, fontWeight: 500,
            color: "var(--inbox-text-muted, #A09888)",
            background: "transparent", border: "none", cursor: "pointer",
          }}>
            <Filter size={12} /> Filtrar
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WhatsAppLayout
          initialFilter={
            activeFilter === "grupos" ? "groups"
            : activeFilter === "finalizados" ? "resolved"
            : activeFilter === "fila" ? "queue"
            : "inbox"
          }
        />
      </div>
    </div>
  );
}
