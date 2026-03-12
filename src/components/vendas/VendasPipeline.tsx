import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useNegocios } from "@/hooks/useNegocios";
import { usePipelines } from "@/hooks/usePipelines";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, DollarSign, Target, CheckCircle, BarChart3, GripVertical, Radar, GitBranch, Settings2, Loader2 } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, ALL_STATUSES, ACTIVE_STATUSES, type Negocio, type NegocioStatus } from "@/types/vendas";
import NegocioCreateModal from "@/components/vendas/NegocioCreateModal";
import NegocioDrawer from "@/components/vendas/NegocioDrawer";
import MotivoPerdaModal from "@/components/vendas/MotivoPerdaModal";
import FechamentoGanhoModal from "@/components/vendas/FechamentoGanhoModal";
import PipelineManager from "@/components/vendas/PipelineManager";

export default function VendasPipeline() {
  const { pipelines, selectedPipeline, selectedPipelineId, selectPipeline, isLoading: pipelinesLoading, createPipeline } = usePipelines();
  const { negocios, isLoading, changeStatus } = useNegocios(selectedPipelineId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [origemFilter, setOrigemFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedNegocio, setSelectedNegocio] = useState<Negocio | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const [perdaModal, setPerdaModal] = useState<Negocio | null>(null);
  const [ganhoModal, setGanhoModal] = useState<Negocio | null>(null);

  const dragItem = useRef<Negocio | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle highlight from URL
  useEffect(() => {
    const hId = searchParams.get("highlight");
    if (hId) {
      setHighlightId(hId);
      const neg = negocios.find(n => n.id === hId);
      if (neg) {
        setSelectedNegocio(neg);
        setDrawerOpen(true);
        setTimeout(() => {
          cardRefs.current[hId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
        setTimeout(() => setHighlightId(null), 2000);
      }
      searchParams.delete("highlight");
      setSearchParams(searchParams, { replace: true });
    }
  }, [negocios, searchParams, setSearchParams]);

  // Use pipeline stages if available, otherwise default
  const pipelineStatuses = useMemo(() => {
    if (selectedPipeline?.stages?.length) {
      return selectedPipeline.stages
        .filter(s => s.enabled)
        .sort((a, b) => a.ordem - b.ordem)
        .map(s => s.key as NegocioStatus);
    }
    return ACTIVE_STATUSES;
  }, [selectedPipeline]);

  const visibleStatuses = showClosed ? pipelineStatuses : pipelineStatuses.filter(s => s !== 'fechado_ganho' && s !== 'fechado_perdido');

  const statusConfig = useMemo(() => {
    if (selectedPipeline?.stages?.length) {
      const map: Record<string, { label: string; color: string; ordem: number }> = {};
      selectedPipeline.stages.forEach(s => {
        map[s.key] = { label: s.label, color: s.color, ordem: s.ordem };
      });
      return { ...NEGOCIO_STATUS_CONFIG, ...map };
    }
    return NEGOCIO_STATUS_CONFIG;
  }, [selectedPipeline]);

  const filtered = useMemo(() => {
    let list = negocios;
    if (origemFilter === "digital_intelligence") list = list.filter(n => n.origem === "digital_intelligence");
    else if (origemFilter === "manual") list = list.filter(n => n.origem !== "digital_intelligence");
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      (n.cliente_nome || '').toLowerCase().includes(q) ||
      (n.consultor_nome || '').toLowerCase().includes(q)
    );
  }, [negocios, search, origemFilter]);

  const columns = useMemo(() => {
    return visibleStatuses.map(status => ({
      status,
      config: statusConfig[status] || NEGOCIO_STATUS_CONFIG[status] || { label: status, color: '#888', ordem: 0 },
      items: filtered.filter(n => n.status === status),
    }));
  }, [filtered, visibleStatuses, statusConfig]);

  const kpis = useMemo(() => {
    const activeKeys = pipelineStatuses.filter(s => s !== 'fechado_ganho' && s !== 'fechado_perdido');
    const active = negocios.filter(n => activeKeys.includes(n.status));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const pipelineTotal = active.reduce((s, n) => s + n.valor_liquido, 0);
    const previsaoMes = active.filter(n => {
      if (!n.data_previsao_fechamento) return false;
      const d = new Date(n.data_previsao_fechamento);
      return d >= monthStart && d <= monthEnd;
    }).reduce((s, n) => s + n.valor_liquido, 0);

    const ganhosMes = negocios.filter(n => {
      if (n.status !== 'fechado_ganho' || !n.data_fechamento) return false;
      const d = new Date(n.data_fechamento);
      return d >= monthStart && d <= monthEnd;
    }).reduce((s, n) => s + n.valor_liquido, 0);

    const fechados = negocios.filter(n => n.status === 'fechado_ganho' || n.status === 'fechado_perdido');
    const ganhos = negocios.filter(n => n.status === 'fechado_ganho');
    const taxaConversao = fechados.length > 0 ? (ganhos.length / fechados.length) * 100 : 0;

    return { pipelineTotal, previsaoMes, ganhosMes, taxaConversao };
  }, [negocios, pipelineStatuses]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleDrop = async (status: NegocioStatus) => {
    if (!dragItem.current || dragItem.current.status === status) return;
    const neg = dragItem.current;

    if (status === 'fechado_perdido') {
      setPerdaModal(neg);
      return;
    }
    if (status === 'fechado_ganho') {
      setGanhoModal(neg);
      return;
    }

    await changeStatus(neg, status);
    toast.success(`Negócio movido para ${(statusConfig[status] || NEGOCIO_STATUS_CONFIG[status])?.label || status}`);
  };

  const openDrawer = (n: Negocio) => {
    setSelectedNegocio(n);
    setDrawerOpen(true);
  };

  function getDigitalScore(neg: Negocio): number | null {
    if (neg.origem !== "digital_intelligence") return null;
    const match = (neg.notas || "").match(/Score Digital:\s*(\d+)\/10/);
    return match ? parseInt(match[1]) : null;
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return "#4ade80";
    if (score >= 5) return "#f59e0b";
    return "#f87171";
  }

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Selector */}
      {pipelines.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5 overflow-x-auto">
            {pipelines.map(p => (
              <button
                key={p.id}
                onClick={() => selectPipeline(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  selectedPipelineId === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => {
              createPipeline({ name: `Pipeline ${pipelines.length + 1}` });
              toast.success("Novo pipeline criado!");
            }}
          >
            <Plus className="h-3 w-3" /> Novo Pipeline
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setManagerOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={DollarSign} label="Pipeline Total" value={fmt(kpis.pipelineTotal)} />
        <KPICard icon={Target} label="Previsão Mês" value={fmt(kpis.previsaoMes)} />
        <KPICard icon={CheckCircle} label="Ganhos (mês)" value={fmt(kpis.ganhosMes)} />
        <KPICard icon={BarChart3} label="Taxa Conversão" value={`${kpis.taxaConversao.toFixed(1)}%`} />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar negócio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="digital_intelligence">
              <span className="flex items-center gap-1.5"><Radar className="h-3 w-3" /> Digital Intelligence</span>
            </SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={showClosed} onCheckedChange={setShowClosed} id="show-closed" />
          <Label htmlFor="show-closed" className="text-xs text-muted-foreground cursor-pointer">Exibir fechados</Label>
        </div>
        <PermissionGate module="vendas" action="create">
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Novo Negócio</Button>
        </PermissionGate>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(col => (
          <div
            key={col.status}
            className="flex-shrink-0 w-[280px] rounded-xl border border-border/40 bg-muted/20"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.status)}
          >
            <div className="p-3 border-b border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.config.color }} />
                <span className="text-xs font-semibold text-foreground">{col.config.label}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{col.items.length}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{fmt(col.items.reduce((s, n) => s + n.valor_liquido, 0))}</div>
            </div>

            <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
              {col.items.map(neg => {
                const diScore = getDigitalScore(neg);
                const isHighlighted = neg.id === highlightId;
                return (
                  <div
                    key={neg.id}
                    ref={el => { cardRefs.current[neg.id] = el; }}
                    draggable
                    onDragStart={() => { dragItem.current = neg; }}
                    onDragEnd={() => { dragItem.current = null; }}
                    onClick={() => openDrawer(neg)}
                    className={`p-3 rounded-lg border bg-card cursor-pointer hover:border-primary/30 transition-all group ${isHighlighted ? "ring-2 ring-primary border-primary animate-pulse" : "border-border/30"}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-semibold text-foreground leading-tight truncate">{neg.titulo}</h4>
                      <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                    </div>
                    {neg.cliente_nome && (
                      <p className="text-[11px] text-muted-foreground truncate mt-1">{neg.cliente_nome}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-foreground">{fmt(neg.valor_liquido)}</span>
                      <ProbabilityBadge value={neg.probabilidade} />
                    </div>
                    {neg.origem === "digital_intelligence" && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Radar className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-primary">Digital Intelligence</span>
                        {diScore !== null && (
                          <span className="text-[10px] font-bold ml-auto px-1.5 py-0.5 rounded-full" style={{ background: `${getScoreColor(diScore)}20`, color: getScoreColor(diScore) }}>
                            {diScore}/10
                          </span>
                        )}
                      </div>
                    )}
                    {neg.consultor_nome && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 truncate">👤 {neg.consultor_nome}</p>
                    )}
                    {neg.data_previsao_fechamento && (
                      <p className={`text-[10px] mt-0.5 ${new Date(neg.data_previsao_fechamento) < new Date() ? 'text-destructive' : 'text-muted-foreground'}`}>
                        📅 {new Date(neg.data_previsao_fechamento).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {neg.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {neg.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {col.items.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground/50">Nenhum negócio</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <NegocioCreateModal onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
          {selectedNegocio && <NegocioDrawer negocio={selectedNegocio} onClose={() => setDrawerOpen(false)} />}
        </SheetContent>
      </Sheet>

      {perdaModal && (
        <MotivoPerdaModal negocio={perdaModal} onClose={() => setPerdaModal(null)} />
      )}

      {ganhoModal && (
        <FechamentoGanhoModal negocio={ganhoModal} onClose={() => setGanhoModal(null)} />
      )}

      {/* Pipeline Manager Dialog */}
      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <PipelineManager onClose={() => setManagerOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPICard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProbabilityBadge({ value }: { value: number }) {
  const color = value < 30 ? '#f87171' : value < 70 ? '#f59e0b' : '#4ade80';
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
      {value}%
    </span>
  );
}
