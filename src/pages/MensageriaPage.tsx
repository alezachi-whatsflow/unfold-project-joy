import { useState } from "react";
import {
  Inbox, Send, Megaphone, Kanban, Users, UsersRound, Receipt, ScrollText,
  UserCog, Building2, MessageSquareText, Tag, Bot, FileText, Zap,
  BarChart3, Menu,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useSidebarState } from "@/hooks/useSidebarState";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
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
import AttendanceMetrics from "@/components/mensageria/metrics/AttendanceMetrics";

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
  { id: "metricas",  label: "Métricas",                icon: BarChart3,        group: "tools" },
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
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

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
      case "metricas":        return <AttendanceMetrics />;
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

    if (!expanded) {
      // Collapsed: icon with scale effect + tooltip
      return (
        <div className="relative flex justify-center">
          <button
            onClick={() => setActiveTab(item.id)}
            className={`nav-icon-hover ${isActive ? "active" : ""}`}
            style={{ width: 38, height: 38 }}
          >
            <Icon size={18} />
            <span className="nav-icon-tooltip-right">{item.label}</span>
          </button>
        </div>
      );
    }

    // Expanded: full label with hover effect
    return (
      <button
        onClick={() => setActiveTab(item.id)}
        className={cn(
          "nav-icon-hover flex items-center gap-3 w-full rounded-lg",
          expanded ? "px-3 py-2" : "justify-center py-2.5",
          isActive ? "active" : ""
        )}
        style={{ transformOrigin: "left center", justifyContent: "flex-start" }}
      >
        <Icon size={18} className="shrink-0" />
        <span className="text-xs font-medium truncate">{item.label}</span>
      </button>
    );
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
        {/* Logo + Toggle */}
        <div className={cn("flex items-center shrink-0 gap-2", expanded ? "px-3 py-2.5" : "justify-center py-2.5")} style={{ borderBottom: "1px solid var(--border, hsl(var(--border)))" }}>
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground transition-colors">
            <Menu size={18} />
          </button>
          {expanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(slug ? `/app/${slug}/home` : "/")}
                  className="flex items-center gap-2 ml-auto hover:opacity-80 transition-opacity"
                >
                  <img src={whatsflowLogo} alt="Whatsflow" className="h-7 w-7 rounded-lg" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Central de Controle</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1">
          {/* Logo (collapsed) → navigates to Central de Controle */}
          {!expanded && (
            <div className="flex justify-center mb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(slug ? `/app/${slug}/home` : "/")}
                    className="nav-icon-hover"
                    style={{ width: 38, height: 38 }}
                  >
                    <img src={whatsflowLogo} alt="Whatsflow" className="h-6 w-6 rounded-md" />
                    <span className="nav-icon-tooltip-right">Central de Controle</span>
                  </button>
                </TooltipTrigger>
              </Tooltip>
            </div>
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
