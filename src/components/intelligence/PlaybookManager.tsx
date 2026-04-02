import { useState } from "react";
import { usePlaybooks, usePlaybookSessions, type Playbook, type PlaybookField } from "@/hooks/usePlaybooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Bot, Pencil, Trash2, Play, Pause, Users, BarChart3,
  MessageSquare, AlertTriangle, CheckCircle2, Target, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/dateUtils";
import { FeatureHint } from "@/components/ui/FeatureHint";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  qualification: { label: "Qualificacao", color: "text-blue-500 bg-blue-500/10", icon: Target },
  diagnostic: { label: "Diagnostico", color: "text-purple-500 bg-purple-500/10", icon: MessageSquare },
  followup: { label: "Follow-Up", color: "text-amber-500 bg-amber-500/10", icon: Users },
  post_sale: { label: "Pos-Venda", color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  custom: { label: "Personalizado", color: "text-muted-foreground bg-muted", icon: Bot },
};

const TONE_OPTIONS = [
  { value: "profissional", label: "Profissional" },
  { value: "casual", label: "Casual" },
  { value: "tecnico", label: "Tecnico" },
  { value: "amigavel", label: "Amigavel" },
];

export function PlaybookManager() {
  const { playbooks, isLoading, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybooks();
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedForStats, setSelectedForStats] = useState<string | null>(null);

  const activeCount = playbooks.filter(p => p.is_active).length;
  const totalSessions = playbooks.reduce((s, p) => s + p.total_sessions, 0);
  const avgCompletion = playbooks.length > 0
    ? playbooks.reduce((s, p) => s + (p.avg_completion_rate || 0), 0) / playbooks.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Playbooks de I.A.
            <FeatureHint
              title="O que sao Playbooks?"
              description="Agentes de IA que conversam com seus leads no WhatsApp, coletam dados automaticamente e escalam para humano quando necessario. Economize ate 4h/dia do seu time."
            />
          </h2>
          <p className="text-sm text-muted-foreground">
            Funcionarios autonomos que conduzem conversas e coletam dados do CRM
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={playbooks.length >= 20}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Novo Playbook
          {playbooks.length >= 20 && <span className="text-[10px]">(limite)</span>}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{playbooks.length}<span className="text-sm text-muted-foreground">/20</span></p>
          <p className="text-xs text-muted-foreground">Playbooks</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Sessoes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{avgCompletion.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">Conclusao Media</p>
        </CardContent></Card>
      </div>

      {/* Playbook Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : playbooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum playbook criado.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Playbooks serao pre-configurados automaticamente ao finalizar o Wizard do CRM.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playbooks.map((pb) => {
            const cat = CATEGORY_CONFIG[pb.category] || CATEGORY_CONFIG.custom;
            const CatIcon = cat.icon;
            return (
              <Card key={pb.id} className={cn("transition-all", !pb.is_active && "opacity-50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className={cn("h-4 w-4", cat.color.split(" ")[0])} />
                      <CardTitle className="text-sm">{pb.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn("text-[9px]", cat.color)}>{cat.label}</Badge>
                      {pb.is_native && <Badge variant="secondary" className="text-[9px]">Nativo</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pb.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{pb.description}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{pb.fields_to_extract?.length || 0} campos</span>
                    <span>{pb.total_sessions} sessoes</span>
                    <span>{pb.avg_completion_rate || 0}% conclusao</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={pb.is_active}
                        onCheckedChange={(v) => updatePlaybook.mutate({ id: pb.id, is_active: v })}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground">{pb.is_active ? "Ativo" : "Inativo"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPlaybook(pb)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedForStats(pb.id)}>
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                      {!pb.is_native && (
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => { if (confirm("Excluir playbook?")) deletePlaybook.mutate(pb.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(showCreate || editingPlaybook) && (
        <PlaybookFormDialog
          playbook={editingPlaybook}
          onClose={() => { setShowCreate(false); setEditingPlaybook(null); }}
          onSave={(data) => {
            if (editingPlaybook) {
              updatePlaybook.mutate({ id: editingPlaybook.id, ...data });
            } else {
              createPlaybook.mutate(data);
            }
            setShowCreate(false);
            setEditingPlaybook(null);
          }}
        />
      )}

      {/* Stats Dialog */}
      {selectedForStats && (
        <PlaybookStatsDialog
          playbookId={selectedForStats}
          playbook={playbooks.find(p => p.id === selectedForStats)!}
          onClose={() => setSelectedForStats(null)}
        />
      )}
    </div>
  );
}

/* ── FORM DIALOG ── */
function PlaybookFormDialog({ playbook, onClose, onSave }: {
  playbook: Playbook | null;
  onClose: () => void;
  onSave: (data: Partial<Playbook>) => void;
}) {
  const [name, setName] = useState(playbook?.name || "");
  const [description, setDescription] = useState(playbook?.description || "");
  const [objectivePrompt, setObjectivePrompt] = useState(playbook?.objective_prompt || "");
  const [persona, setPersona] = useState(playbook?.persona || "assistente");
  const [tone, setTone] = useState(playbook?.tone || "profissional");
  const [category, setCategory] = useState(playbook?.category || "custom");
  const [fields, setFields] = useState<PlaybookField[]>(playbook?.fields_to_extract || []);
  const [escalationKeywords, setEscalationKeywords] = useState((playbook?.escalation_keywords || []).join(", "));
  const [maxMessages, setMaxMessages] = useState(playbook?.max_messages || 20);

  const addField = () => {
    setFields([...fields, { key: `field_${fields.length + 1}`, label: "", type: "text", required: false, question_hint: "" }]);
  };

  const updateField = (idx: number, updates: Partial<PlaybookField>) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{playbook ? "Editar Playbook" : "Novo Playbook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Qualificacao de Leads" /></div>
            <div className="col-span-2"><Label>Descricao</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="O que este playbook faz" /></div>
          </div>

          <div>
            <Label>Prompt do Objetivo *</Label>
            <Textarea value={objectivePrompt} onChange={e => setObjectivePrompt(e.target.value)} rows={4}
              placeholder="Voce e um assistente de vendas da empresa X. Seu objetivo e qualificar o lead descobrindo: orcamento, prazo e necessidade principal. Seja cordial e objetivo." />
            <p className="text-[10px] text-muted-foreground mt-1">Instrucao que define o comportamento da IA durante a conversa.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Persona</Label><Input value={persona} onChange={e => setPersona(e.target.value)} placeholder="assistente" /></div>
            <div>
              <Label>Tom</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fields to extract */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Campos para Extrair ({fields.length})</Label>
              <Button size="sm" variant="outline" onClick={addField} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Campo
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 items-end p-2 bg-muted/30 rounded">
                <div className="col-span-3">
                  <Input value={f.label} onChange={e => updateField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="Nome do campo" className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Select value={f.type} onValueChange={v => updateField(i, { type: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["text", "number", "currency", "date", "select", "boolean", "email", "phone"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input value={f.question_hint || ""} onChange={e => updateField(i, { question_hint: e.target.value })} placeholder="Pergunta guia para a IA" className="h-8 text-xs" />
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <Switch checked={f.required} onCheckedChange={v => updateField(i, { required: v })} className="scale-75" />
                  <span className="text-[9px]">Obrig.</span>
                </div>
                <div className="col-span-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeField(i)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Escalation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Palavras de Escalonamento</Label>
              <Input value={escalationKeywords} onChange={e => setEscalationKeywords(e.target.value)} placeholder="reclamacao, cancelar, falar com humano" className="text-xs" />
              <p className="text-[10px] text-muted-foreground">Separadas por virgula</p>
            </div>
            <div>
              <Label>Max Mensagens IA</Label>
              <Input type="number" min={5} max={50} value={maxMessages} onChange={e => setMaxMessages(Number(e.target.value))} />
              <p className="text-[10px] text-muted-foreground">Escala para humano apos esse limite</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!name.trim() || !objectivePrompt.trim()) { toast.error("Nome e prompt sao obrigatorios"); return; }
            onSave({
              name: name.trim(),
              description: description.trim() || null,
              objective_prompt: objectivePrompt.trim(),
              persona, tone, category,
              fields_to_extract: fields,
              escalation_keywords: escalationKeywords.split(",").map(k => k.trim()).filter(Boolean),
              max_messages: maxMessages,
            } as any);
          }}>
            {playbook ? "Salvar" : "Criar Playbook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── STATS DIALOG ── */
function PlaybookStatsDialog({ playbookId, playbook, onClose }: { playbookId: string; playbook: Playbook; onClose: () => void }) {
  const { data: sessions = [] } = usePlaybookSessions(playbookId);

  const completed = sessions.filter(s => s.status === "completed").length;
  const escalated = sessions.filter(s => s.status === "escalated").length;
  const active = sessions.filter(s => s.status === "active").length;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Estatisticas: {playbook.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{completed}</p>
              <p className="text-[10px] text-muted-foreground">Concluidas</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-amber-500">{escalated}</p>
              <p className="text-[10px] text-muted-foreground">Escaladas</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-500">{active}</p>
              <p className="text-[10px] text-muted-foreground">Em andamento</p>
            </CardContent></Card>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessao registrada.</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {sessions.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                  <div>
                    <p className="font-medium">{s.contact_name || s.contact_jid || "Desconhecido"}</p>
                    <p className="text-[10px] text-muted-foreground">{s.messages_count} msgs · {fmtDateTime(s.started_at)}</p>
                  </div>
                  <Badge variant={s.status === "completed" ? "default" : s.status === "escalated" ? "destructive" : "secondary"} className="text-[9px]">
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
