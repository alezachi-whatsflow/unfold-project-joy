import { useState } from "react";
import { MessageSquareText, Clock, FileText } from "lucide-react";
import QuickReplyManager from "./quick-replies/QuickReplyManager";
import CadenciaManager from "./cadencia/CadenciaManager";
import HSMTemplateManager from "./templates/HSMTemplateManager";

const TABS = [
  { id: "rapidas", label: "Msgs Rápidas", icon: MessageSquareText, color: "#10B981" },
  { id: "cadencia", label: "Cadência de Msgs", icon: Clock, color: "#818CF8" },
  { id: "hsm", label: "Templates HSM", icon: FileText, color: "#3B82F6" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ModelosMsgTabs() {
  const [active, setActive] = useState<TabId>("rapidas");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex shrink-0 gap-1 px-4 pt-3 pb-0"
        style={{ background: "hsl(var(--card))" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all relative"
              style={{
                color: isActive ? tab.color : "hsl(var(--muted-foreground))",
                background: isActive ? `${tab.color}08` : "transparent",
                borderBottom: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="h-px" style={{ background: "hsl(var(--border))" }} />

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "rapidas" && <QuickReplyManager />}
        {active === "cadencia" && <CadenciaManager />}
        {active === "hsm" && <HSMTemplateManager />}
      </div>
    </div>
  );
}
