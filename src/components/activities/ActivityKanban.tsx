import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical, Clock, AlertTriangle } from "lucide-react";
import type { Activity } from "@/hooks/useActivities";

const COLUMNS: { key: Activity["status"]; label: string; color: string }[] = [
  { key: "todo", label: "A Fazer", color: "bg-muted" },
  { key: "in_progress", label: "Em Andamento", color: "bg-primary/10" },
  { key: "done", label: "Concluído", color: "bg-green-500/10" },
];

const PRIORITY_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Baixa", variant: "secondary" },
  medium: { label: "Média", variant: "outline" },
  high: { label: "Alta", variant: "default" },
  urgent: { label: "Urgente", variant: "destructive" },
};

interface Props {
  activities: Activity[];
  isLoading: boolean;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Activity["status"]) => void;
}

export function ActivityKanban({ activities, isLoading, onEdit, onDelete, onStatusChange }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = activities.filter((a) => a.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <div className={`px-3 py-2 ${col.color}`}>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {col.label}
                <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
              </h3>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {items.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  columns={COLUMNS}
                />
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onStatusChange,
  columns,
}: {
  activity: Activity;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Activity["status"]) => void;
  columns: typeof COLUMNS;
}) {
  const p = PRIORITY_MAP[activity.priority] || PRIORITY_MAP.medium;
  const isOverdue = activity.due_date && new Date(activity.due_date) < new Date() && activity.status !== "done";

  return (
    <Card className="border-border hover:transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground leading-tight flex-1">{activity.title}</h4>
          <Badge variant={p.variant} className="text-[10px] shrink-0">{p.label}</Badge>
        </div>

        {activity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
        )}

        {activity.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {new Date(activity.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
            {activity.due_time && ` às ${activity.due_time.slice(0, 5)}`}
          </div>
        )}

        {activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activity.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="flex gap-0.5">
            {columns
              .filter((c) => c.key !== activity.status)
              .map((c) => (
                <Button
                  key={c.key}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => onStatusChange(activity.id, c.key)}
                >
                  → {c.label}
                </Button>
              ))}
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(activity)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(activity.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
