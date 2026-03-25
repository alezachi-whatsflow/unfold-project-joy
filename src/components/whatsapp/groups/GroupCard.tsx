import { useDraggable } from "@dnd-kit/core";
import { Users, MessageSquare, Clock, UserCheck } from "lucide-react";
import type { WhatsAppGroup } from "@/hooks/useGroupKanban";

interface Props {
  group: WhatsAppGroup;
  isDragging?: boolean;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function GroupCard({ group, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: group.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const initials = (group.name || "GR")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: isDragging ? "var(--shadow)" : "none",
        opacity: isDragging ? 0.9 : 1,
        ...style,
      }}
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "var(--acc-bg)", color: "var(--acc)" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {group.name || group.jid}
          </p>
          {group.description && (
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              {group.description}
            </p>
          )}
        </div>
        {group.unread_count > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: "var(--unread-bg)", color: "var(--unread-text)" }}
          >
            {group.unread_count}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {group.participant_count}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {timeAgo(group.last_message_at)}
        </span>
        {group.assigned_to && (
          <span className="flex items-center gap-1 ml-auto" style={{ color: "var(--acc)" }}>
            <UserCheck size={12} />
            Atribuído
          </span>
        )}
      </div>

      {/* Tags */}
      {group.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {group.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--tag-bg)", color: "var(--tag-text)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
