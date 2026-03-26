import { useState } from "react";
import {
  Inbox, Send, Megaphone, Kanban, Users, UsersRound, Receipt, ScrollText,
  UserCog, Building2, MessageSquareText, Tag, Bot, FileText, Zap,
  Menu,
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
import { GroupKanbanBoard } from "@/components/whatsapp/groups/GroupKanbanBoard";
import QuickReplyManager from "@/components/mensageria/quick-replies/QuickReplyManager";
import AgentDashboard from "@/components/mensageria/agents/AgentDashboard";
import DepartmentManager from "@/components/mensageria/agents/DepartmentManager";
import ContactTagManager from "@/components/mensageria/agents/ContactTagManager";
import HSMTemplateManager from "@/components/mensageria/templates/HSMTemplateManager";
import AutomationManager from "@/components/mensageria/automation/AutomationManager";

/* ── Sidebar nav items ── */
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group: "operation" | "tools" | "config";
}

const NAV_ITEMS: NavItem[] = [
  // Group 1 — Operation
  { id: "inbox",     label: "Caixa de Entrada",   icon: Inbox,            group: "operation" },
  // Group 2 — Tools
  { id: "enviar",    label: "Envios em Massa",    icon: Send,             group: "tools" },
  { id: "campanhas", label: "Campanhas",           icon: Megaphone,        group: "tools" },
  { id: "leads",     label: "Leads",               icon: Kanban,           group: "tools" },
  { id: "grupos",    label: "Grupos",               icon: UsersRound,       group: "tools" },
  { id: "contatos",  label: "Contatos",            icon: Users,            group: "tools" },
  { id: "templates",  label: "Templates HSM",        icon: FileText,         group: "tools" },
  { id: "cobranca",  label: "Cobrança",              icon: Receipt,          group: "tools" },
  { id: "logs",      label: "Logs",                   icon: ScrollText,       group: "tools" },
  // Config items
  { id: "atendentes",       label: "Atendentes",           icon: UserCog,            group: "config" },
  { id: "setores",          label: "Setores",              icon: Building2,          group: "config" },
  { id: "msg-predefinidas", label: "Respostas Rápidas",    icon: MessageSquareText,  group: "config" },
  { id: "tags-contato",     label: "Tags de Contato",      icon: Tag,                group: "config" },
  { id: "automacoes",       label: "Automações",           icon: Zap,                group: "config" },
];


/* ── Component ── */
const MensageriaPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");
  const { expanded, toggle } = useSidebarState("wf_msg_sidebar");

  const renderContent = () => {
    switch (activeTab) {
      // Operation
      case "inbox":           return <InboxTab />;
      // Tools
      case "enviar":          return <MessageComposer onClose={() => setActiveTab("inbox")} />;
      case "campanhas":       return <CampaignsTab />;
      case "leads":           return <LeadKanban />;
      case "grupos":          return <div className="h-full overflow-hidden"><GroupKanbanBoard /></div>;
      case "contatos":        return <ContactChecker />;
      case "templates":       return <HSMTemplateManager />;
      case "cobranca":        return <BillingRulesTab />;
      case "logs":            return <LogsTab />;
      // Config
      case "atendentes":      return <AgentDashboard />;
      case "setores":         return <DepartmentManager />;
      case "msg-predefinidas": return <QuickReplyManager />;
      case "tags-contato":    return <ContactTagManager />;
      case "automacoes":      return <AutomationManager />;
      default:                return <InboxTab />;
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
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col shrink-0 transition-all duration-250 ease-[cubic-bezier(.4,0,.2,1)]",
          expanded ? "w-[200px]" : "w-[52px]"
        )}
        style={{ background: "var(--bg-surface, hsl(var(--card)))", borderRight: "1px solid var(--border, hsl(var(--border)))" }}
      >
        {/* Toggle + Back to Dashboard */}
        <div className={cn("flex items-center shrink-0 gap-2", expanded ? "px-3 py-3" : "justify-center py-3")} style={{ borderBottom: "1px solid var(--border, hsl(var(--border)))" }}>
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
            <Menu size={18} />
          </button>
          {expanded && (
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
              title="Voltar ao Painel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Painel
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1">
          {/* Back to dashboard (collapsed only) */}
          {!expanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => window.history.back()}
                  className="flex justify-center w-full py-2.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors mb-1"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Voltar ao Painel</TooltipContent>
            </Tooltip>
          )}

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

          {/* Config items (flat, no collapsible) */}
          {NAV_ITEMS.filter(i => i.group === "config").map(item => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default MensageriaPage;
