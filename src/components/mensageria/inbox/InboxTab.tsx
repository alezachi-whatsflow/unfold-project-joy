import { useState } from "react";
import { Headphones, ListOrdered, UsersRound, CheckCircle2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout";

type InboxFilter = "atendimento" | "fila" | "grupos" | "finalizados";

const INBOX_TABS: { id: InboxFilter; label: string; icon: React.ElementType; color: string }[] = [
  { id: "atendimento", label: "Em atendimento", icon: Headphones, color: "#10b981" },
  { id: "fila",        label: "Fila para atendimento", icon: ListOrdered, color: "#f59e0b" },
  { id: "grupos",      label: "Grupos", icon: UsersRound, color: "#6366f1" },
  { id: "finalizados", label: "Finalizados", icon: CheckCircle2, color: "#6b7280" },
];

export default function InboxTab() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("atendimento");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar with tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {INBOX_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isActive ? "shadow-sm" : "opacity-60 hover:opacity-100"
              )}
              style={{
                background: isActive ? `${tab.color}20` : "transparent",
                color: isActive ? tab.color : "var(--text-secondary)",
                border: isActive ? `1px solid ${tab.color}40` : "1px solid transparent",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            <Filter size={12} />
            Filtrar
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <WhatsAppLayout initialFilter={activeFilter === "grupos" ? "groups" : activeFilter === "finalizados" ? "resolved" : activeFilter === "fila" ? "queue" : "inbox"} />
      </div>
    </div>
  );
}
