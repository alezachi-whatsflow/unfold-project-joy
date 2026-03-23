import { cn } from "@/lib/utils";

interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
  totalCount: number;
  unreadCount: number;
  groupCount: number;
  resolvedCount: number;
}

const tabs = [
  { id: "inbox", label: "Todas", countKey: "totalCount" },
  { id: "queue", label: "Minhas", countKey: "unreadCount" },
  { id: "groups", label: "Grupos", countKey: "groupCount" },
  { id: "resolved", label: "Resolvidas", countKey: "resolvedCount" },
] as const;

export default function FilterTabs({ active, onChange, totalCount, unreadCount, groupCount, resolvedCount }: FilterTabsProps) {
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
    </div>
  );
}
