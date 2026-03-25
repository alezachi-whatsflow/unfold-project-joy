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
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl min-w-[280px] w-[300px] shrink-0 transition-colors"
      style={{
        background: isOver ? "var(--bg-active)" : "var(--bg-surface)",
        border: `1px solid ${isOver ? column.color : "var(--border)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
        <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {column.name}
        </span>
        <span
          className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
        >
          {groups.length}
        </span>
        {column.sla_minutes && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>
            SLA {column.sla_minutes}min
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
        {groups.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            Arraste grupos aqui
          </p>
        )}
      </div>
    </div>
  );
}
