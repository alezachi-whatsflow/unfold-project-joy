import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ConversationList from "./ConversationList";
import ChatArea from "./ChatArea";
import ContactPanel from "./ContactPanel";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "./mockInboxData";

export default function InboxTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  const selected = MOCK_CONVERSATIONS.find((c) => c.id === selectedId) || null;
  const messages = selectedId ? MOCK_MESSAGES[selectedId] || [] : [];

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-lg border border-border overflow-hidden">
      {/* Sidebar - conversations */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={MOCK_CONVERSATIONS}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <ChatArea
            conversation={selected}
            messages={messages}
            onTogglePanel={() => setShowPanel(!showPanel)}
            showPanel={showPanel}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecione uma conversa</p>
            <p className="text-sm">Escolha um contato na lista ao lado para iniciar.</p>
          </div>
        )}
      </div>

      {/* Contact panel */}
      {selected && showPanel && (
        <ContactPanel conversation={selected} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
