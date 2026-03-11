import { MessageCircle, User, Users, Hash, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
  totalCount: number;
  unreadCount: number;
}

const tabs = [
  { id: "inbox", icon: MessageCircle, label: "Caixa de entrada" },
  { id: "queue", icon: User, label: "Fila de atendimento" },
  { id: "groups", icon: Users, label: "Grupos" },
  { id: "resolved", icon: Hash, label: "Finalizados" },
  { id: "more", icon: MoreHorizontal, label: "Mais" },
];

export default function FilterTabs({ active, onChange, totalCount, unreadCount }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1" style={{ borderBottom: "1px solid var(--wa-border)" }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        const count = tab.id === "all" ? totalCount : tab.id === "unread" ? unreadCount : undefined;
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
