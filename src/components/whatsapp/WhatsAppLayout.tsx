import { useState, useRef, useCallback } from "react";
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
  initialFilter?: "inbox" | "queue" | "groups" | "resolved";
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
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = sessionStorage.getItem("wf_inbox_panel_w");
    return saved ? Number(saved) : 340;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(340);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newW = Math.max(260, Math.min(600, startW.current + (ev.clientX - startX.current)));
      setLeftWidth(newW);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      sessionStorage.setItem("wf_inbox_panel_w", String(leftWidth));
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [leftWidth]);

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

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="shrink-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors hidden md:block"
        style={{ background: "var(--wa-border, hsl(var(--border)))" }}
        title="Arraste para redimensionar"
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
