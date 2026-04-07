import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import type { Message } from "@/data/mockMessages";
import MessageBubble from "./MessageBubble";
import { ArrowDown, Loader2 } from "lucide-react";

import { fmtDateSeparator } from "@/lib/dateUtils";

function formatDateSeparator(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [dd, mm, yyyy] = parts;
  return fmtDateSeparator(new Date(+yyyy, +mm - 1, +dd));
}

interface MessageListProps {
  messages: Message[];
  conversationId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function MessageList({ messages, conversationId, onLoadMore, hasMore }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const prevLengthRef = useRef(0);
  const prevConversationRef = useRef<string | undefined>(undefined);
  const scrollHeightBeforeLoadRef = useRef<number>(0);

  const initialLoadTimeRef = useRef(0);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId !== prevConversationRef.current) {
      prevConversationRef.current = conversationId;
      prevLengthRef.current = 0;
      initialLoadTimeRef.current = 0;
      setIsAtBottom(true);
      setLoadingMore(false);
    }
  }, [conversationId]);

  // Force scroll to absolute bottom
  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    // Belt-and-suspenders: also use endRef
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length === 0) return;

    const now = Date.now();

    // Within first 3 seconds of conversation load — always scroll to bottom
    // This handles async batch loads (messages arrive in waves)
    if (initialLoadTimeRef.current === 0) {
      initialLoadTimeRef.current = now;
    }
    const isInitialLoadWindow = now - initialLoadTimeRef.current < 3000;

    if (isInitialLoadWindow && !loadingMore) {
      prevLengthRef.current = messages.length;
      // Use setTimeout to ensure images/media have rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
      });
      return;
    }

    const newCount = messages.length;
    const wasAdded = newCount > prevLengthRef.current;

    // Check if messages were prepended (load more) vs appended (new message)
    const wasPrepended = wasAdded && loadingMore;

    if (wasPrepended) {
      // Maintain scroll position after prepending older messages
      const el = containerRef.current;
      if (el) {
        const prevScrollHeight = scrollHeightBeforeLoadRef.current;
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight;
        });
      }
      setLoadingMore(false);
    } else if (wasAdded) {
      // Always scroll when a new outgoing message is added (user just sent)
      const lastMsg = messages[messages.length - 1];
      const isNewOutgoing = lastMsg?.direction === "outgoing";

      if (isNewOutgoing || isAtBottom) {
        scrollToBottom(true);
      }
    }

    prevLengthRef.current = newCount;
  }, [messages, isAtBottom, loadingMore, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    setIsAtBottom(atBottom);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!onLoadMore || loadingMore) return;
    const el = containerRef.current;
    if (el) {
      scrollHeightBeforeLoadRef.current = el.scrollHeight;
    }
    setLoadingMore(true);
    onLoadMore();
  }, [onLoadMore, loadingMore]);

  // Group by date for separators
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let lastDate = "";
    messages.forEach((m) => {
      const date = (m.timestamp.split(" ")[0] || "").replace(/[,.]$/, "");
      if (date !== lastDate) {
        groups.push({ date, msgs: [m] });
        lastDate = date;
      } else {
        groups[groups.length - 1].msgs.push(m);
      }
    });
    return groups;
  }, [messages]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto chat-wallpaper py-4"
        style={{ contain: "strict" }}
      >
        {/* Load more button */}
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground hover:text-primary cursor-pointer text-center py-2 inline-flex items-center gap-1"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Carregando...
                </>
              ) : (
                "Carregar mensagens anteriores"
              )}
            </button>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex justify-center my-3">
              <span
                className="text-xs px-3 py-1"
                style={{ backgroundColor: "var(--wa-bg-panel)", color: "var(--wa-text-secondary)" }}
              >
                {formatDateSeparator(group.date)}
              </span>
            </div>
            {group.msgs.map((m, i) => {
              const prev = i > 0 ? group.msgs[i - 1] : null;
              const showSender = !prev || prev.senderName !== m.senderName || prev.direction !== m.direction;
              return <MemoizedMessageBubble key={m.id} message={m} showSender={showSender} />;
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-4 right-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--wa-bg-header)", width: 40, height: 40 }}
          aria-label="Ir para o final"
        >
          <ArrowDown size={20} style={{ color: "var(--wa-green)" }} />
        </button>
      )}
    </div>
  );
}

/* Memoized wrapper to avoid re-rendering unchanged bubbles */
const MemoizedMessageBubble = React.memo(MessageBubble);
