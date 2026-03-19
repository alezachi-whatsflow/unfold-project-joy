import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityKanban } from "@/components/activities/ActivityKanban";
import { ActivityCalendar } from "@/components/activities/ActivityCalendar";
import { ActivityFormDialog } from "@/components/activities/ActivityFormDialog";
import { useActivities } from "@/hooks/useActivities";

export default function ActivitiesPage() {
  const [tab, setTab] = useState("kanban");
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const { activities, isLoading, createActivity, updateActivity, deleteActivity } = useActivities();

  const openNew = () => { setEditingActivity(null); setFormOpen(true); };
  const openEdit = (a: any) => { setEditingActivity(a); setFormOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">Gerencie tarefas e rotinas do dia a dia</p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Nova Atividade
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5 text-xs">
            <Kanban className="h-3.5 w-3.5" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <ActivityKanban
            activities={activities}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={deleteActivity}
            onStatusChange={(id, status) => updateActivity({ id, status })}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <ActivityCalendar
            activities={activities}
            isLoading={isLoading}
            onEdit={openEdit}
            onDateChange={(id, date) => updateActivity({ id, due_date: date })}
          />
        </TabsContent>
      </Tabs>

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={(data) => editingActivity ? updateActivity({ id: editingActivity.id, ...data }) : createActivity(data)}
        editing={editingActivity}
      />
    </div>
  );
}
