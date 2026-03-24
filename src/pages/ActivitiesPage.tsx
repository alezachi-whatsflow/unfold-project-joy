import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityKanban } from "@/components/activities/ActivityKanban";
import { ActivityCalendar } from "@/components/activities/ActivityCalendar";
import { ActivityFormDialog } from "@/components/activities/ActivityFormDialog";
import { useActivities, type Activity } from "@/hooks/useActivities";
import { useNegocios } from "@/hooks/useNegocios";
import { usePipelines } from "@/hooks/usePipelines";
import { useTenantId } from "@/hooks/useTenantId";
import type { Negocio } from "@/types/vendas";

function negocioToActivity(n: Negocio): Activity {
  const statusMap: Record<string, Activity["status"]> = {
    prospeccao: "todo", qualificado: "todo",
    proposta: "in_progress", negociacao: "in_progress",
    fechado_ganho: "done", fechado_perdido: "done",
  };
  const priorityMap: Record<string, Activity["priority"]> = {
    prospeccao: "low", qualificado: "medium",
    proposta: "high", negociacao: "urgent",
    fechado_ganho: "medium", fechado_perdido: "low",
  };
  return {
    id: `negocio-${n.id}`,
    tenant_id: n.tenant_id || "",
    title: `💼 ${n.titulo}`,
    description: `${n.cliente_nome || "Sem cliente"} — R$ ${(n.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    status: statusMap[n.status] || "todo",
    priority: priorityMap[n.status] || "medium",
    due_date: n.data_previsao_fechamento || null,
    due_time: null,
    assigned_to: n.consultor_id || null,
    related_customer_id: n.cliente_id || null,
    tags: ["CRM", n.status],
    created_by: null,
    created_at: n.created_at,
    updated_at: n.updated_at || n.created_at,
  };
}

export default function ActivitiesPage() {
  const tenantId = useTenantId();
  const [tab, setTab] = useState("kanban");
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const { activities, isLoading: activitiesLoading, createActivity, updateActivity, deleteActivity } = useActivities();
  const { selectedPipelineId } = usePipelines(tenantId);
  const { negocios, isLoading: negociosLoading } = useNegocios(tenantId, selectedPipelineId);

  const merged = useMemo(() => {
    const fromDeals = negocios.map(negocioToActivity);
    return [...fromDeals, ...activities];
  }, [negocios, activities]);

  const isLoading = activitiesLoading || negociosLoading;

  const openNew = () => { setEditingActivity(null); setFormOpen(true); };
  const openEdit = (a: Activity) => {
    if (a.id.startsWith("negocio-")) return;
    setEditingActivity(a); setFormOpen(true);
  };
  const handleDelete = (id: string) => {
    if (id.startsWith("negocio-")) return;
    deleteActivity(id);
  };
  const handleStatusChange = (id: string, status: Activity["status"]) => {
    if (id.startsWith("negocio-")) return;
    updateActivity({ id, status });
  };

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
            activities={merged}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <ActivityCalendar
            activities={merged}
            isLoading={isLoading}
            onEdit={openEdit}
            onDateChange={(id, date) => {
              if (id.startsWith("negocio-")) return;
              updateActivity({ id, due_date: date });
            }}
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
