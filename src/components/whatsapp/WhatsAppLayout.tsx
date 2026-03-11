import { useState, useMemo } from "react";
import { mockConversations } from "@/data/mockConversations";
import { mockMessages } from "@/data/mockMessages";
import LeftPanel from "./panels/LeftPanel";
import ChatPanel from "./panels/ChatPanel";
import RightPanel from "./panels/RightPanel";

export default function WhatsAppLayout() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(false);

  const selectedConv = useMemo(
    () => mockConversations.find((c) => c.id === selectedId) || null,
    [selectedId]
  );

  const messages = useMemo(
    () => (selectedId ? mockMessages.filter((m) => m.conversationId === selectedId) : []),
    [selectedId]
  );

  const handleSend = (text: string) => {
    // Mock: just log for now — real integration will use uazapi
    console.log("Send:", text);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "var(--wa-bg-deep)" }}>
      {/* Left Panel — fixed 360px */}
      <div className="shrink-0 h-full hidden md:flex" style={{ width: 360 }}>
        <LeftPanel conversations={mockConversations} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Chat Panel — flex-1 */}
      <ChatPanel
        conversation={selectedConv}
        messages={messages}
        isRightOpen={rightOpen}
        onToggleRight={() => setRightOpen(!rightOpen)}
        onSend={handleSend}
      />

      {/* Right Panel — 320px collapsible */}
      <RightPanel
        conversation={selectedConv}
        isOpen={rightOpen}
        onClose={() => setRightOpen(false)}
      />
    </div>
  );
}
