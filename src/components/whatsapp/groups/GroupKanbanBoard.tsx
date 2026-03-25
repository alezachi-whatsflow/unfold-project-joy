import { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { useGroupKanban, type WhatsAppGroup } from "@/hooks/useGroupKanban";
import { GroupKanbanColumn } from "./GroupKanbanColumn";
import { GroupCard } from "./GroupCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════
// Group Kanban Board — Drag & Drop
// Real-time updates via Supabase subscription
// ═══════════════════════════════════════════

export function GroupKanbanBoard() {
  const { columns, groups, isLoading, moveGroup } = useGroupKanban();
  const [activeGroup, setActiveGroup] = useState<WhatsAppGroup | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group groups by column
  const groupsByColumn = useMemo(() => {
    const map: Record<string, WhatsAppGroup[]> = {};
    const defaultCol = columns.find((c) => c.is_default);

    for (const col of columns) {
      map[col.id] = [];
    }

    // Unassigned column
    map["__unassigned"] = [];

    for (const group of groups) {
      const colId = group.kanban_column_id;
      if (colId && map[colId]) {
        map[colId].push(group);
      } else if (defaultCol) {
        map[defaultCol.id].push(group);
      } else {
        map["__unassigned"].push(group);
      }
    }

    return map;
  }, [columns, groups]);

  function handleDragStart(event: DragStartEvent) {
    const group = groups.find((g) => g.id === event.active.id);
    setActiveGroup(group || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveGroup(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groupId = active.id as string;
    const targetColumnId = over.id as string;

    // Only move if dropping onto a valid column
    const validColumn = columns.find((c) => c.id === targetColumnId);
    if (!validColumn) return;

    try {
      await moveGroup({ groupId, columnId: targetColumnId });
    } catch {
      toast.error("Erro ao mover grupo");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--acc)" }} />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Nenhum grupo encontrado
        </p>
        <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>
          Os grupos serão sincronizados automaticamente quando mensagens de grupo chegarem via webhook.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {columns.map((col) => (
          <GroupKanbanColumn
            key={col.id}
            column={col}
            groups={groupsByColumn[col.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeGroup ? <GroupCard group={activeGroup} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
