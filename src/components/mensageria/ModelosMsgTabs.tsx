import { useState } from "react";
import { MessageSquareText, Clock, FileText } from "lucide-react";
import QuickReplyManager from "./quick-replies/QuickReplyManager";
import CadenciaManager from "./cadencia/CadenciaManager";
import HSMTemplateManager from "./templates/HSMTemplateManager";

const TABS = [
  { id: "rapidas", label: "Msgs Rápidas", icon: MessageSquareText },
  { id: "cadencia", label: "Cadência de Msgs", icon: Clock },
  { id: "hsm", label: "Templates HSM", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ModelosMsgTabs() {
  const [active, setActive] = useState<TabId>("rapidas");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface, hsl(var(--card)))" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: isActive ? "var(--acc, hsl(var(--primary)))" : "var(--text-muted, hsl(var(--muted-foreground)))",
              }}
            >
              <Icon size={16} />
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--acc, hsl(var(--primary)))" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "rapidas" && <QuickReplyManager />}
        {active === "cadencia" && <CadenciaManager />}
        {active === "hsm" && <HSMTemplateManager />}
      </div>
    </div>
  );
}
