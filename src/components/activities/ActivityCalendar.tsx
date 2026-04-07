import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/hooks/useActivities";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/20 text-primary",
  high: "bg-orange-500/20 text-orange-600",
  urgent: "bg-destructive/20 text-destructive",
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-muted-foreground",
  in_progress: "bg-primary",
  done: "bg-green-500",
};

interface Props {
  activities: Activity[];
  isLoading: boolean;
  onEdit: (a: Activity) => void;
  onDateChange: (id: string, date: string) => void;
}

export function ActivityCalendar({ activities, isLoading, onEdit, onDateChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const activitiesByDate = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    activities.forEach((a) => {
      if (a.due_date) {
        const key = a.due_date;
        if (!map[key]) map[key] = [];
        map[key].push(a);
      }
    });
    return map;
  }, [activities]);

  const selectedDayStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedActivities = selectedDayStr ? (activitiesByDate[selectedDayStr] || []) : [];
  const unscheduled = activities.filter((a) => !a.due_date);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Calendar Grid */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`e-${i}`} className="h-20" />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayActivities = activitiesByDate[key] || [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "h-20 border border-transparent p-1 text-left transition-colors hover:border-border",
                    isToday(day) && "bg-primary/5 border-primary/30",
                    isSelected && "border-primary ring-1 ring-primary/30"
                  )}
                >
                  <span className={cn("text-xs font-medium", isToday(day) ? "text-primary" : "text-foreground")}>
                    {day.getDate()}
                  </span>
                  <div className="mt-0.5 space-y-0.5 overflow-hidden">
                    {dayActivities.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-1">
                        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[a.status])} />
                        <span className="text-[9px] text-muted-foreground truncate">{a.title}</span>
                      </div>
                    ))}
                    {dayActivities.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{dayActivities.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar: selected day details */}
      <div className="space-y-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </h4>
            {selectedActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma atividade neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedActivities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 p-2 border border-border hover:bg-secondary/50 cursor-pointer"
                    onClick={() => onEdit(a)}
                  >
                    <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", STATUS_DOT[a.status])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                        {(a as any).gcal_synced && (
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" title="Google Calendar"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        )}
                        {a.title}
                      </p>
                      {a.due_time && <p className="text-[10px] text-muted-foreground">{a.due_time.slice(0, 5)}</p>}
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] shrink-0", PRIORITY_COLORS[a.priority])}>
                      {a.priority === "urgent" ? "Urgente" : a.priority === "high" ? "Alta" : a.priority === "medium" ? "Média" : "Baixa"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {unscheduled.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Sem data ({unscheduled.length})</h4>
              <div className="space-y-1">
                {unscheduled.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="text-xs text-foreground p-1.5 rounded hover:bg-secondary/50 cursor-pointer truncate"
                    onClick={() => onEdit(a)}
                  >
                    {a.title}
                  </div>
                ))}
                {unscheduled.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">+{unscheduled.length - 5} mais</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
