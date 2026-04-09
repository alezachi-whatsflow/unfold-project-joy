import { useState } from "react";
import LeftPanel from "./panels/LeftPanel";
import ChatPanel from "./panels/ChatPanel";
import RightPanel from "./panels/RightPanel";
import { GroupKanbanBoard } from "./groups/GroupKanbanBoard";

import { useConversations } from "@/hooks/whatsapp/useConversations";
import { useMessages } from "@/hooks/whatsapp/useMessages";
import { useRealtimeSync } from "@/hooks/whatsapp/useRealtimeSync";
import { useMessageSender } from "@/hooks/whatsapp/useMessageSender";
import { useSectorAccess } from "@/hooks/useSectorAccess";

/* ── main component ────────────────────────────────── */
interface WhatsAppLayoutProps {
  initialFilter?: "inbox" | "queue" | "groups" | "groups_inbox" | "groups_queue" | "groups_resolved" | "resolved";
  /** When 'groups', the entire layout only shows group conversations */
  mode?: "direct" | "groups";
}

export default function WhatsAppLayout({ initialFilter }: WhatsAppLayoutProps = {}) {
  const {
    conversations: allConversations, fetchConversations,
    assignConversation, resolveConversation,
  } = useConversations();
  const { filterBySector } = useSectorAccess();
  const conversations = filterBySector(allConversations as any[]) as typeof allConversations;

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

  // Resizable left panel
  const leftWidth = 340;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--wa-bg-deep, var(--bg-base))" }}>
      {/* Left Panel — resizable */}
      <div className="shrink-0 h-full hidden md:flex overflow-hidden" style={{ width: leftWidth }}>
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

      {/* Divider */}
      <div
        className="shrink-0 w-px hidden md:block"
        style={{ background: "var(--wa-border, hsl(var(--border)))" }}
      />

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
