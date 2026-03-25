import { useDraggable } from "@dnd-kit/core";
import { Users, Clock, UserCheck } from "lucide-react";
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

function getSlaStatus(lastMsg: string | null): "ok" | "warn" | "critical" | "inactive" {
  if (!lastMsg) return "inactive";
  const mins = (Date.now() - new Date(lastMsg).getTime()) / 60000;
  if (mins < 30) return "ok";
  if (mins < 120) return "warn";
  return "critical";
}

export function GroupCard({ group, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: group.id });

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const sla = getSlaStatus(group.last_message_at);

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
      className={`kanban-card ${isDragging ? "active" : ""}`}
      style={style}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div className={`sla-dot ${sla}`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="card-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {group.name || group.jid}
          </p>
        </div>
        {group.unread_count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
            background: "var(--inbox-active-color)", color: "#FFF",
          }}>
            {group.unread_count}
          </span>
        )}
      </div>

      {/* Description */}
      {group.description && (
        <p className="card-desc" style={{ marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {group.description}
        </p>
      )}

      {/* Meta */}
      <div className="card-meta">
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Users size={11} /> {group.participant_count}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Clock size={11} /> {timeAgo(group.last_message_at)}
        </span>
        {group.assigned_to && (
          <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto", color: "var(--inbox-active-color)" }}>
            <UserCheck size={11} /> Atribuído
          </span>
        )}
      </div>

      {/* Tags */}
      {group.tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {group.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 9, padding: "1px 6px", borderRadius: 999,
              background: "var(--inbox-active-bg)", color: "var(--inbox-active-color)",
              border: "1px solid var(--inbox-active-border)",
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
