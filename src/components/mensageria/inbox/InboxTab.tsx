import { useState } from "react";
import { Headphones, ListOrdered, UsersRound, CheckCircle2, Filter, LayoutGrid, List } from "lucide-react";
import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout";
import { GroupKanbanBoard } from "@/components/whatsapp/groups/GroupKanbanBoard";

type InboxFilter = "atendimento" | "fila" | "grupos" | "finalizados";
type ViewMode = "list" | "kanban";

const INBOX_TABS: { id: InboxFilter; label: string; icon: React.ElementType; color: string }[] = [
  { id: "atendimento", label: "Em atendimento", icon: Headphones, color: "#0E8A5C" },
  { id: "fila",        label: "Fila",           icon: ListOrdered, color: "#E8A84A" },
  { id: "grupos",      label: "Grupos",         icon: UsersRound,  color: "#5B9EF7" },
  { id: "finalizados", label: "Finalizados",    icon: CheckCircle2, color: "#A09888" },
];

export default function InboxTab() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("atendimento");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const showKanban = activeFilter === "grupos" && viewMode === "kanban";

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
              onClick={() => { setActiveFilter(tab.id); if (tab.id !== "grupos") setViewMode("list"); }}
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

        {/* View mode toggle — only on Grupos */}
        {activeFilter === "grupos" && (
          <div style={{
            marginLeft: "auto", display: "flex", gap: 2,
            background: "var(--inbox-card, #FAFAF8)",
            border: "1px solid var(--inbox-border, #E8E5DF)",
            borderRadius: 8, padding: 2,
          }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: 4, borderRadius: 6, border: "none", cursor: "pointer",
                background: viewMode === "list" ? "var(--inbox-active-bg)" : "transparent",
                color: viewMode === "list" ? "var(--inbox-active-color)" : "var(--inbox-text-muted)",
              }}
              title="Lista"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                padding: 4, borderRadius: 6, border: "none", cursor: "pointer",
                background: viewMode === "kanban" ? "var(--inbox-active-bg)" : "transparent",
                color: viewMode === "kanban" ? "var(--inbox-active-color)" : "var(--inbox-text-muted)",
              }}
              title="Kanban"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        )}

        {/* Filter button */}
        <button style={{
          marginLeft: activeFilter !== "grupos" ? "auto" : 0,
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 6,
          fontSize: 11, fontWeight: 500,
          color: "var(--inbox-text-muted, #A09888)",
          background: "transparent", border: "none", cursor: "pointer",
        }}>
          <Filter size={12} /> Filtrar
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {showKanban ? (
          <GroupKanbanBoard />
        ) : (
          <WhatsAppLayout
            initialFilter={
              activeFilter === "grupos" ? "groups"
              : activeFilter === "finalizados" ? "resolved"
              : activeFilter === "fila" ? "queue"
              : "inbox"
            }
          />
        )}
      </div>
    </div>
  );
}
