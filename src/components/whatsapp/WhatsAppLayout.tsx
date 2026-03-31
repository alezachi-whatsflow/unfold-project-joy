import { useState } from "react";
import LeftPanel from "./panels/LeftPanel";
import ChatPanel from "./panels/ChatPanel";
import RightPanel from "./panels/RightPanel";
import { GroupKanbanBoard } from "./groups/GroupKanbanBoard";

import { useConversations } from "@/hooks/whatsapp/useConversations";
import { useMessages } from "@/hooks/whatsapp/useMessages";
import { useRealtimeSync } from "@/hooks/whatsapp/useRealtimeSync";
import { useMessageSender } from "@/hooks/whatsapp/useMessageSender";

/* ── main component ────────────────────────────────── */
interface WhatsAppLayoutProps {
  initialFilter?: "inbox" | "queue" | "groups" | "resolved";
}

export default function WhatsAppLayout({ initialFilter }: WhatsAppLayoutProps = {}) {
  const {
    conversations, fetchConversations,
    assignConversation, resolveConversation,
  } = useConversations();

  const {
    messages, messageLimit,
    selectedJidRef, lastSyncRef, lastStatusSyncRef, messagesCacheRef,
    resolveMessageMediaUrl, mapDbMessageToUi, updateMessagesWithCache,
    fetchMessages, selectConversation, loadMoreMessages,
  } = useMessages();

  useRealtimeSync({
    selectedJidRef, lastSyncRef, lastStatusSyncRef, messagesCacheRef,
    conversations, fetchConversations, fetchMessages,
    resolveMessageMediaUrl, mapDbMessageToUi, updateMessagesWithCache,
  });

  const { handleSend, handleSendAttachment } = useMessageSender({
    selectedJidRef, conversations, fetchConversations, fetchMessages,
  });

  const [rightOpen, setRightOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [groupViewMode, setGroupViewMode] = useState<"list" | "kanban">("list");
  const [activeFilter, setActiveFilter] = useState("inbox");

  const selectedJid = selectedJidRef.current;
  const selectedConv = conversations.find((c) => c.id === selectedJid) || null;
  const showKanban = activeFilter === "groups" && groupViewMode === "kanban";

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--wa-bg-deep, var(--bg-base))" }}>
      {/* Left Panel */}
      <div className="shrink-0 h-full hidden md:flex overflow-hidden" style={{ width: 340 }}>
        <LeftPanel
          conversations={conversations}
          selectedId={selectedJid}
          onSelect={selectConversation}
          newConvOpen={newConvOpen}
          onNewConvOpenChange={setNewConvOpen}
          onNewConversationStarted={(jid) => {
            fetchConversations();
            selectConversation(jid);
          }}
          viewMode={groupViewMode}
          onViewModeChange={setGroupViewMode}
          onFilterChange={setActiveFilter}
          initialFilter={initialFilter}
          onAssignConversation={assignConversation}
        />
      </div>

      {/* Central panel */}
      {showKanban ? (
        <div className="flex-1 overflow-hidden" style={{ background: "var(--bg-base)" }}>
          <GroupKanbanBoard />
        </div>
      ) : (
        <>
          <ChatPanel
            conversation={selectedConv}
            messages={messages}
            isRightOpen={rightOpen}
            onToggleRight={() => setRightOpen(!rightOpen)}
            onSend={handleSend}
            onSendAttachment={handleSendAttachment}
            onNewConversation={() => setNewConvOpen(true)}
            onAssign={selectedConv ? () => assignConversation(selectedConv.id) : undefined}
            onResolve={selectedConv ? () => resolveConversation(selectedConv.id) : undefined}
            activeFilter={activeFilter}
            onLoadMore={loadMoreMessages}
            hasMore={messages.length >= messageLimit}
          />
          <RightPanel
            conversation={selectedConv}
            isOpen={rightOpen}
            onClose={() => setRightOpen(false)}
          />
        </>
      )}
    </div>
  );
}
