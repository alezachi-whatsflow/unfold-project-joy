import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
  totalCount: number;
  unreadCount: number;
  groupCount: number;
  resolvedCount: number;
  viewMode?: "list" | "kanban";
  onViewModeChange?: (mode: "list" | "kanban") => void;
}

const tabs = [
  { id: "inbox", label: "Todas", countKey: "totalCount" },
  { id: "queue", label: "Minhas", countKey: "unreadCount" },
  { id: "groups", label: "Grupos", countKey: "groupCount" },
  { id: "resolved", label: "Resolvidas", countKey: "resolvedCount" },
] as const;

export default function FilterTabs({ active, onChange, totalCount, unreadCount, groupCount, resolvedCount, viewMode, onViewModeChange }: FilterTabsProps) {
  const counts: Record<string, number> = { totalCount, unreadCount, groupCount, resolvedCount };

  return (
    <div className="msg-filter-tabs">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const count = tab.countKey ? counts[tab.countKey] : undefined;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn("msg-filter-tab", isActive && "active")}
          >
            {tab.label}
            {count !== undefined && count > 0 && (
              <span
                className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: isActive ? "var(--acc-bg, rgba(255,255,255,0.1))" : "var(--bg-card, rgba(255,255,255,0.05))",
                  color: isActive ? "var(--acc, inherit)" : "var(--text-muted, inherit)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* Kanban toggle — only visible when "Grupos" tab is active */}
      {active === "groups" && onViewModeChange && (
        <div className="ml-auto flex items-center gap-0.5 p-0.5" style={{ background: "var(--bg-card)" }}>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn("p-1", viewMode === "list" && "")}
            style={{
              background: viewMode === "list" ? "var(--acc-bg)" : "transparent",
              color: viewMode === "list" ? "var(--acc)" : "var(--text-muted)",
            }}
            title="Lista"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => onViewModeChange("kanban")}
            className={cn("p-1", viewMode === "kanban" && "")}
            style={{
              background: viewMode === "kanban" ? "var(--acc-bg)" : "transparent",
              color: viewMode === "kanban" ? "var(--acc)" : "var(--text-muted)",
            }}
            title="Kanban"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
