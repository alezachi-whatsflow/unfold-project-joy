import { useRef, useEffect, useMemo, useState } from "react";
import type { Message } from "@/data/mockMessages";
import MessageBubble from "./MessageBubble";
import { ArrowDown } from "lucide-react";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const prevLengthRef = useRef(0);

  useEffect(() => {
    const newCount = messages.length;
    const wasAdded = newCount > prevLengthRef.current;
    prevLengthRef.current = newCount;

    // Always scroll when a new outgoing message is added (user just sent)
    const lastMsg = messages[messages.length - 1];
    const isNewOutgoing = wasAdded && lastMsg?.direction === "outgoing";

    if (isNewOutgoing || isAtBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(atBottom);
  };

  // Group by date for separators
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let lastDate = "";
    messages.forEach((m) => {
      const date = m.timestamp.split(" ")[0] || "";
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
        style={{ scrollBehavior: "smooth" }}
      >
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex justify-center my-3">
              <span
                className="text-xs px-3 py-1 rounded-lg"
                style={{ backgroundColor: "var(--wa-bg-panel)", color: "var(--wa-text-secondary)" }}
              >
                {group.date}
              </span>
            </div>
            {group.msgs.map((m, i) => {
              const prev = i > 0 ? group.msgs[i - 1] : null;
              const showSender = !prev || prev.senderName !== m.senderName || prev.direction !== m.direction;
              return <MessageBubble key={m.id} message={m} showSender={showSender} />;
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-4 right-4 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: "var(--wa-bg-header)", width: 40, height: 40 }}
          aria-label="Ir para o final"
        >
          <ArrowDown size={20} style={{ color: "var(--wa-green)" }} />
        </button>
      )}
    </div>
  );
}
