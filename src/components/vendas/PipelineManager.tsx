import { useState, useCallback } from "react";
import { usePipelines, type SalesPipeline } from "@/hooks/usePipelines";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GitBranch, Plus, Trash2, GripVertical, Save, Star, Loader2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import CustomFieldsBuilder from "./CustomFieldsBuilder";
import type { CardFieldSchema } from "@/types/vendas";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  onClose: () => void;
}

export default function PipelineManager({ onClose }: Props) {
  const tenantId = useTenantId();
  const { pipelines, updatePipeline, createPipeline, deletePipeline } = usePipelines(tenantId);
  const [editId, setEditId] = useState<string | null>(pipelines[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("stages");

  const editPipeline = pipelines.find(p => p.id === editId);

  const [name, setName] = useState(editPipeline?.name || "");
  const [description, setDescription] = useState(editPipeline?.description || "");
  const [stages, setStages] = useState(editPipeline?.stages || []);
  const [cardSchema, setCardSchema] = useState<CardFieldSchema[]>(
    (editPipeline as any)?.card_schema || []
  );

  const selectPipeline = (p: SalesPipeline) => {
    setEditId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setStages([...p.stages]);
    setCardSchema((p as any).card_schema || []);
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await updatePipeline(editId, {
        name,
        description,
        stages,
        card_schema: cardSchema,
      } as any);
      toast.success("Pipeline salvo!");
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    try {
      await createPipeline({ name: `Pipeline ${pipelines.length + 1}` });
      toast.success("Pipeline criado!");
    } catch {
      toast.error("Erro ao criar pipeline");
    }
  };

  const handleDelete = async () => {
    if (!editId || pipelines.length <= 1) {
      toast.error("Nao e possivel excluir o unico pipeline");
      return;
    }
    try {
      await deletePipeline(editId);
      const remaining = pipelines.filter(p => p.id !== editId);
      if (remaining.length > 0) selectPipeline(remaining[0]);
      toast.success("Pipeline removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleSetDefault = async () => {
    if (!editId) return;
    for (const p of pipelines) {
      if (p.is_default && p.id !== editId) {
        await updatePipeline(p.id, { is_default: false } as any);
      }
    }
    await updatePipeline(editId, { is_default: true } as any);
    toast.success("Pipeline definido como padrao!");
  };

  const updateStage = (index: number, field: string, value: any) => {
    const updated = [...stages];
    (updated[index] as any)[field] = value;
    setStages(updated);
  };

  const addStage = () => {
    const key = `etapa_${Date.now()}`;
    setStages([...stages, { key, label: "Nova Etapa", color: "#94a3b8", enabled: true, ordem: stages.length + 1 }]);
  };

  const removeStage = (index: number) => {
    const stage = stages[index];
    if (stage.key === "fechado_ganho" || stage.key === "fechado_perdido") {
      toast.error("Etapas de fechamento nao podem ser removidas");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  // ── dnd-kit for stage reordering ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex(s => s.key === active.id);
    const newIndex = stages.findIndex(s => s.key === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
    setStages(reordered);
  }, [stages]);

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Gerenciar Pipelines
        </DialogTitle>
        <DialogDescription>
          Configure etapas, campos personalizados e comportamento de cada pipeline.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex gap-4">
        {/* Pipeline list */}
        <div className="w-48 shrink-0 space-y-2">
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => selectPipeline(p)}
              className={cn(
                "w-full text-left px-3 py-2.5 border text-xs rounded-md transition-all",
                editId === p.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate">{p.name}</span>
                {p.is_default && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.description || "Sem descricao"}</p>
            </button>
          ))}
          <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={handleCreate}>
            <Plus className="h-3 w-3" /> Novo Pipeline
          </Button>
        </div>

        {/* Pipeline editor */}
        {editPipeline && (
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descricao</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stages" className="text-xs">Etapas do Funil</TabsTrigger>
                <TabsTrigger value="fields" className="text-xs gap-1">
                  <Type className="h-3 w-3" /> Campos Personalizados
                  {cardSchema.length > 0 && (
                    <Badge variant="secondary" className="text-[8px] h-4 px-1 ml-1">{cardSchema.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Stages Tab with dnd-kit */}
              <TabsContent value="stages" className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Arraste para reordenar as etapas</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addStage}>
                    <Plus className="h-3 w-3" /> Etapa
                  </Button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={stages.map(s => s.key)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {stages.map((stage, i) => (
                        <SortableStageRow
                          key={stage.key}
                          stage={stage}
                          index={i}
                          onUpdate={updateStage}
                          onRemove={removeStage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent value="fields" className="mt-3">
                <CustomFieldsBuilder
                  fields={cardSchema}
                  onChange={setCardSchema}
                />
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleSetDefault}>
                  <Star className="h-3 w-3" /> Definir como padrao
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={handleDelete} disabled={pipelines.length <= 1}>
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
              </div>
              <Button size="sm" className="gap-1 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar Pipeline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sortable Stage Row (dnd-kit) ── */
function SortableStageRow({
  stage, index, onUpdate, onRemove,
}: {
  stage: any;
  index: number;
  onUpdate: (i: number, field: string, value: any) => void;
  onRemove: (i: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isProtected = stage.key === "fechado_ganho" || stage.key === "fechado_perdido";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border border-border rounded-md p-2 bg-card"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </button>
      <input
        type="color"
        value={stage.color}
        onChange={e => onUpdate(index, "color", e.target.value)}
        className="w-6 h-6 rounded border-0 cursor-pointer shrink-0"
      />
      <Input
        value={stage.label}
        onChange={e => onUpdate(index, "label", e.target.value)}
        className="h-7 text-xs flex-1"
      />
      <Switch
        checked={stage.enabled}
        onCheckedChange={v => onUpdate(index, "enabled", v)}
        className="shrink-0"
      />
      {!isProtected ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ) : (
        <Badge variant="secondary" className="text-[9px] shrink-0">Protegido</Badge>
      )}
    </div>
  );
}
