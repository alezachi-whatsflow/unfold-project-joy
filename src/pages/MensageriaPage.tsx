import { useState } from "react";
import {
  Inbox, Send, Megaphone, Kanban, Users, Receipt, ScrollText,
  Settings, Link2, UserCog, Building2, MessageSquareText, Tag, Bot,
  HelpCircle, Menu, ChevronDown, ChevronUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/useSidebarState";
import InboxTab from "@/components/mensageria/inbox/InboxTab";
import BillingRulesTab from "@/components/mensageria/BillingRulesTab";
import LogsTab from "@/components/mensageria/LogsTab";
import MessageComposer from "@/components/mensageria/MessageComposer";
import ContactChecker from "@/components/mensageria/ContactChecker";
import LeadKanban from "@/components/mensageria/LeadKanban";
import CampaignsTab from "@/components/mensageria/CampaignsTab";

/* ── Sidebar nav items ── */
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group: "operation" | "tools" | "config";
}

const NAV_ITEMS: NavItem[] = [
  // Group 1 — Operation
  { id: "inbox",     label: "Caixa de Entrada", icon: Inbox,            group: "operation" },
  // Group 2 — Tools
  { id: "enviar",    label: "Envios em Massa",  icon: Send,             group: "tools" },
  { id: "campanhas", label: "Campanhas",         icon: Megaphone,        group: "tools" },
  { id: "leads",     label: "Leads",             icon: Kanban,           group: "tools" },
  { id: "contatos",  label: "Contatos",          icon: Users,            group: "tools" },
  { id: "cobranca",  label: "Cobrança",          icon: Receipt,          group: "tools" },
  { id: "logs",      label: "Logs",              icon: ScrollText,       group: "tools" },
];

const CONFIG_ITEMS = [
  { id: "integracoes",    label: "Integrações",          icon: Link2 },
  { id: "atendentes",     label: "Atendentes",           icon: UserCog },
  { id: "setores",        label: "Setores",              icon: Building2 },
  { id: "msg-predefinidas", label: "Msgs Pré-definidas", icon: MessageSquareText },
  { id: "tags-contato",   label: "Tags de Contato",      icon: Tag },
  { id: "automacoes",     label: "Automações",           icon: Bot },
];

/* ── Component ── */
const MensageriaPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");
  const { expanded, toggle } = useSidebarState("wf_msg_sidebar");
  const [configOpen, setConfigOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "inbox":     return <InboxTab />;
      case "enviar":    return <MessageComposer onClose={() => setActiveTab("inbox")} />;
      case "campanhas": return <CampaignsTab />;
      case "leads":     return <LeadKanban />;
      case "contatos":  return <ContactChecker />;
      case "cobranca":  return <BillingRulesTab />;
      case "logs":      return <LogsTab />;
      default:          return <InboxTab />;
    }
  };

  const SidebarItem = ({ item }: { item: { id: string; label: string; icon: React.ElementType } }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    const btn = (
      <button
        onClick={() => setActiveTab(item.id)}
        className={cn(
          "flex items-center gap-3 w-full rounded-lg transition-all duration-150",
          expanded ? "px-3 py-2" : "justify-center py-2.5",
          isActive
            ? "bg-primary/12 text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
        )}
      >
        <Icon size={18} className="shrink-0" />
        {expanded && <span className="text-xs font-medium truncate">{item.label}</span>}
      </button>
    );

    if (!expanded) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return btn;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 md:-m-8">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col shrink-0 glass-sidebar transition-all duration-250 ease-[cubic-bezier(.4,0,.2,1)]",
          expanded ? "w-[200px]" : "w-[52px]"
        )}
      >
        {/* Toggle */}
        <div className={cn("flex items-center shrink-0 border-b border-border/30", expanded ? "px-3 py-3 justify-between" : "justify-center py-3")}>
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
            <Menu size={18} />
          </button>
          {expanded && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Mensageria</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1">
          {/* Operation group */}
          {NAV_ITEMS.filter(i => i.group === "operation").map(item => (
            <SidebarItem key={item.id} item={item} />
          ))}

          {/* Separator */}
          <div className="h-px bg-border/20 my-2" />

          {/* Tools group */}
          {NAV_ITEMS.filter(i => i.group === "tools").map(item => (
            <SidebarItem key={item.id} item={item} />
          ))}

          {/* Separator */}
          <div className="h-px bg-border/20 my-2" />

          {/* Config group (collapsible) */}
          <div>
            {expanded ? (
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className="shrink-0" />
                  <span className="text-xs font-medium">Configurações</span>
                </div>
                {configOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { if (!expanded) toggle(); setConfigOpen(true); }}
                    className="flex justify-center w-full py-2.5 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Configurações</TooltipContent>
              </Tooltip>
            )}

            {configOpen && expanded && (
              <div className="ml-4 pl-3 border-l border-border/20 mt-1 space-y-0.5 animate-fade-in">
                {CONFIG_ITEMS.map(item => (
                  <button
                    key={item.id}
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150"
                  >
                    <item.icon size={14} className="shrink-0" />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-border/30 shrink-0", expanded ? "px-3 py-2" : "py-2 flex justify-center")}>
          {expanded ? (
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full px-1 py-1">
              <HelpCircle size={16} />
              <span className="text-[11px]">Suporte</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Suporte</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default MensageriaPage;
