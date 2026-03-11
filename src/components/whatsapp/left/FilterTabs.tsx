import { MessageCircle, User, Users, Hash, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
  totalCount: number;
  unreadCount: number;
  groupCount: number;
  resolvedCount: number;
}

const tabs = [
  { id: "inbox", icon: MessageCircle, label: "Caixa de entrada", countKey: "totalCount" },
  { id: "queue", icon: User, label: "Fila de atendimento", countKey: "unreadCount" },
  { id: "groups", icon: Users, label: "Grupos", countKey: "groupCount" },
  { id: "resolved", icon: Hash, label: "Finalizados", countKey: "resolvedCount" },
  { id: "more", icon: MoreHorizontal, label: "Mais", countKey: null },
] as const;

export default function FilterTabs({ active, onChange, totalCount, unreadCount, groupCount, resolvedCount }: FilterTabsProps) {
  const counts: Record<string, number> = { totalCount, unreadCount, groupCount, resolvedCount };

  return (
    <div className="flex items-center gap-1 px-3 py-1" style={{ borderBottom: "1px solid var(--wa-border)" }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        const count = tab.countKey ? counts[tab.countKey] : undefined;
        return (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(tab.id)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium relative"
                style={{
                  color: isActive ? "var(--wa-green)" : "var(--wa-text-secondary)",
                  borderBottom: isActive ? "2px solid var(--wa-green)" : "2px solid transparent",
                  transition: "color 150ms ease",
                }}
              >
                <Icon size={16} />
                {count !== undefined && count > 0 && (
                  <span className="text-[10px]">{count}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {tab.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
