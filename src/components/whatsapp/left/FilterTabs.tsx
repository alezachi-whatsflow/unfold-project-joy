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
              <span className="ml-1 opacity-70">{count}</span>
            )}
          </button>
        );
      })}

      {/* Kanban toggle — only visible when "Grupos" tab is active */}
      {active === "groups" && onViewModeChange && (
        <div className="ml-auto flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "var(--bg-card)" }}>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn("p-1 rounded", viewMode === "list" && "shadow-sm")}
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
            className={cn("p-1 rounded", viewMode === "kanban" && "shadow-sm")}
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
