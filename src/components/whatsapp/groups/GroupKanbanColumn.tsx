import { useDroppable } from "@dnd-kit/core";
import { type KanbanColumn, type WhatsAppGroup } from "@/hooks/useGroupKanban";
import { GroupCard } from "./GroupCard";

interface Props {
  column: KanbanColumn;
  groups: WhatsAppGroup[];
}

export function GroupKanbanColumn({ column, groups }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div ref={setNodeRef} className={`kanban-column ${isOver ? "drag-over" : ""}`}>
      {/* Header */}
      <div className="kanban-column-header">
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: column.color }} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: "var(--inbox-text)" }}>
          {column.name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 999,
          background: "var(--inbox-card)", color: "var(--inbox-text-muted)",
          border: "1px solid var(--inbox-border)",
        }}>
          {groups.length}
        </span>
        {column.sla_minutes && (
          <span style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 999,
            background: "var(--inbox-active-bg)", color: "var(--inbox-active-color)",
          }}>
            SLA {column.sla_minutes}min
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="kanban-column-body">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
        {groups.length === 0 && (
          <p style={{ fontSize: 11, textAlign: "center", padding: "24px 0", color: "var(--inbox-text-muted)" }}>
            Arraste grupos aqui
          </p>
        )}
      </div>
    </div>
  );
}
