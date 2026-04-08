/**
 * GroupsInboxView — Mirror of the Inbox for Groups/Communities only.
 *
 * Reuses 100% of WhatsAppLayout (same chat UI, same message rendering).
 * The only difference: top tabs filter by groups instead of 1:1 contacts.
 * TanStack Query cache is shared — conversations are fetched once.
 */
import { useState } from "react"
import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout"
import { Headphones, ListOrdered, CheckCircle2, UsersRound } from "lucide-react"

const TABS = [
  { id: "groups_inbox",    label: "Em atendimento", icon: Headphones, color: "#0E8A5C" },
  { id: "groups_queue",    label: "Fila",           icon: ListOrdered, color: "#E8A84A" },
  { id: "groups_resolved", label: "Finalizados",    icon: CheckCircle2, color: "#A09888" },
] as const

type TabId = typeof TABS[number]["id"]

export default function GroupsInboxView() {
  const [activeTab, setActiveTab] = useState<TabId>("groups_inbox")

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top tabs — same visual as InboxTab */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        <UsersRound className="h-4 w-4 text-primary mr-1" />
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              style={isActive ? { backgroundColor: tab.color } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Reuse WhatsAppLayout with groups-only filter */}
      <div className="flex-1 overflow-hidden">
        <WhatsAppLayout
          initialFilter={activeTab as any}
          mode="groups"
        />
      </div>
    </div>
  )
}
