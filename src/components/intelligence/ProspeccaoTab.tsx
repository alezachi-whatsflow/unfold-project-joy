import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Globe, Instagram, MapPin, Phone, Building2, Users, Flame, Eye, MessageCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const NICHOS = [
  "Escola particular", "Clínica odontológica", "Pet shop", "Academia",
  "Restaurante", "Escritório de contabilidade", "Imobiliária", "Salão de beleza",
  "Farmácia", "Oficina mecânica", "Clínica veterinária", "Loja de roupas",
  "Padaria", "Estúdio de pilates", "Consultório médico",
];

type AnalysisStatus = "idle" | "waiting" | "analyzing" | "done";

interface MockLead {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  hasSite: boolean;
  hasInstagram: boolean;
  hasGoogleMaps: boolean;
  hasWhatsApp: boolean;
  niche: string;
  analysisStatus: AnalysisStatus;
  analysisProgress: number;
  score: number | null;
  siteScore: number;
  instagramAuthority: number;
}

const generateMockLeads = (niche: string, city: string): MockLead[] => [
  { id: "1", name: `${niche} Central`, address: `Rua das Flores, 123 - ${city}`, phone: "(11) 99999-0001", hasSite: true, hasInstagram: true, hasGoogleMaps: true, hasWhatsApp: false, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 3, instagramAuthority: 2 },
  { id: "2", name: `${niche} Premium`, address: `Av. Brasil, 456 - ${city}`, phone: "(11) 99999-0002", hasSite: true, hasInstagram: false, hasGoogleMaps: true, hasWhatsApp: true, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 7, instagramAuthority: 0 },
  { id: "3", name: `${niche} Express`, address: `Rua Augusta, 789 - ${city}`, phone: null, hasSite: false, hasInstagram: true, hasGoogleMaps: true, hasWhatsApp: false, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 0, instagramAuthority: 3 },
  { id: "4", name: `${niche} Plus`, address: `Av. Paulista, 1000 - ${city}`, phone: "(11) 99999-0004", hasSite: true, hasInstagram: true, hasGoogleMaps: false, hasWhatsApp: false, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 4, instagramAuthority: 6 },
  { id: "5", name: `${niche} Master`, address: `Rua Consolação, 200 - ${city}`, phone: "(11) 99999-0005", hasSite: false, hasInstagram: false, hasGoogleMaps: true, hasWhatsApp: true, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 0, instagramAuthority: 0 },
  { id: "6", name: `${niche} Top`, address: `Av. Rebouças, 350 - ${city}`, phone: null, hasSite: true, hasInstagram: true, hasGoogleMaps: true, hasWhatsApp: false, niche, analysisStatus: "idle", analysisProgress: 0, score: null, siteScore: 2, instagramAuthority: 4 },
];

function calculateScore(lead: MockLead): number {
  let score = 0;
  if (lead.siteScore < 5) score += 3;
  if (!lead.hasWhatsApp) score += 3;
  if (lead.hasInstagram && lead.instagramAuthority < 5) score += 2;
  if (!lead.hasGoogleMaps) score += 2;
  return Math.min(score, 10);
}

type ScoreCategory = "hot" | "medium" | "low";

function getScoreCategory(score: number): ScoreCategory {
  if (score >= 8) return "hot";
  if (score >= 5) return "medium";
  return "low";
}

const scoreMeta: Record<ScoreCategory, { label: string; color: string; bg: string }> = {
  hot: { label: "🔥 Oportunidade Quente", color: "text-green-400", bg: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Potencial Médio", color: "text-yellow-400", bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Baixa Prioridade", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground" },
};

type FilterType = "all" | ScoreCategory;

export function ProspeccaoTab() {
  const [nichoQuery, setNichoQuery] = useState("");
  const [city, setCity] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leads, setLeads] = useState<MockLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showApproachModal, setShowApproachModal] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filtered = NICHOS.filter((n) => n.toLowerCase().includes(nichoQuery.toLowerCase()));
  const hasAnalyzedLeads = leads.some((l) => l.analysisStatus === "done");
  const pendingCount = leads.filter((l) => l.analysisStatus === "waiting" || l.analysisStatus === "analyzing").length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (!nichoQuery.trim()) return;
    setLeads(generateMockLeads(nichoQuery.trim(), city.trim() || "São Paulo"));
    setSelected(new Set());
    setSearched(true);
    setFilter("all");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const runAnalysisQueue = useCallback(() => {
    if (selected.size === 0) return;
    setAnalysisRunning(true);

    setLeads((prev) =>
      prev.map((l) => selected.has(l.id) ? { ...l, analysisStatus: "waiting" as AnalysisStatus, analysisProgress: 0 } : l)
    );

    const ids = Array.from(selected);
    let idx = 0;

    const processNext = () => {
      if (idx >= ids.length) { setAnalysisRunning(false); setSelected(new Set()); return; }
      const currentId = ids[idx];

      setLeads((prev) => prev.map((l) => l.id === currentId ? { ...l, analysisStatus: "analyzing" as AnalysisStatus } : l));

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setLeads((prev) => prev.map((l) => {
            if (l.id !== currentId) return l;
            const score = calculateScore(l);
            return { ...l, analysisStatus: "done" as AnalysisStatus, analysisProgress: 100, score };
          }));
          idx++;
          setTimeout(processNext, 400);
        } else {
          setLeads((prev) => prev.map((l) => l.id === currentId ? { ...l, analysisProgress: Math.min(progress, 99) } : l));
        }
      }, 300);
    };

    processNext();
  }, [selected]);

  const displayLeads = leads
    .filter((l) => {
      if (filter === "all") return true;
      if (l.score === null) return false;
      return getScoreCategory(l.score) === filter;
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const queueLeads = leads.filter((l) => l.analysisStatus === "waiting" || l.analysisStatus === "analyzing");

  const PresenceIcon = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <span className={active ? "text-[hsl(var(--primary))]" : "text-muted-foreground/40"}>{children}</span>
  );

  const StatusBadge = ({ status }: { status: AnalysisStatus }) => {
    if (status === "waiting") return <Badge variant="outline" className="text-xs">Aguardando</Badge>;
    if (status === "analyzing") return <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Analisando...</Badge>;
    if (status === "done") return <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Concluído</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative" ref={suggestionsRef}>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Segmento de mercado</Label>
              <Input
                placeholder="Ex: Clínica odontológica"
                value={nichoQuery}
                onChange={(e) => { setNichoQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {showSuggestions && nichoQuery && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-48 overflow-auto">
                  {filtered.map((n) => (
                    <button key={n} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground" onClick={() => { setNichoQuery(n); setShowSuggestions(false); }}>{n}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:w-56">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Cidade / Região</Label>
              <Input placeholder="Ex: São Paulo" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full sm:w-auto gap-2"><Search className="h-4 w-4" /> Buscar Leads</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Queue */}
      {queueLeads.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Fila de Análise
              <Badge className="ml-auto">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
            </h3>
            {queueLeads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <StatusBadge status={lead.analysisStatus} />
                  </div>
                  <Progress value={lead.analysisProgress} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(lead.analysisProgress)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Post-analysis filters */}
      {hasAnalyzedLeads && (
        <div className="flex gap-2 flex-wrap">
          {([["all", "Todos"], ["hot", "🔥 Oportunidade Quente"], ["medium", "Potencial Médio"], ["low", "Baixa Prioridade"]] as [FilterType, string][]).map(([key, label]) => (
            <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>{label}</Button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-6"><Users className="h-12 w-12 text-primary" /></div>
          <p className="text-muted-foreground text-sm max-w-sm">Busque por segmento e cidade para encontrar seus próximos clientes</p>
        </div>
      )}

      {/* Results grid */}
      {searched && displayLeads.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayLeads.map((lead) => {
            const cat = lead.score !== null ? getScoreCategory(lead.score) : null;
            const meta = cat ? scoreMeta[cat] : null;
            return (
              <Card key={lead.id} className={`relative transition-colors ${selected.has(lead.id) ? "ring-2 ring-primary" : ""}`}>
                {lead.analysisStatus !== "done" && (
                  <div className="absolute top-3 right-3">
                    <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                  </div>
                )}
                {lead.score !== null && meta && (
                  <div className="absolute top-3 right-3">
                    <Badge className={meta.bg}>{lead.score}/10</Badge>
                  </div>
                )}
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5"><Building2 className="h-5 w-5 text-primary" /></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {lead.address}</p>
                    </div>
                  </div>
                  {lead.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> {lead.phone}</p>
                  )}
                  <div className="flex gap-3 pt-1 border-t border-border">
                    <PresenceIcon active={lead.hasSite}><Globe className="h-4 w-4" /></PresenceIcon>
                    <PresenceIcon active={lead.hasInstagram}><Instagram className="h-4 w-4" /></PresenceIcon>
                    <PresenceIcon active={lead.hasGoogleMaps}><MapPin className="h-4 w-4" /></PresenceIcon>
                  </div>

                  {/* Score label + analyzing state */}
                  {lead.analysisStatus === "analyzing" && (
                    <div className="pt-2 border-t border-border">
                      <Progress value={lead.analysisProgress} className="h-1.5" />
                    </div>
                  )}
                  {lead.analysisStatus === "done" && meta && (
                    <div className="pt-2 border-t border-border space-y-2">
                      <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" className="flex-1 gap-1 text-xs" onClick={() => {/* redirect to overview */}}>
                          <Eye className="h-3 w-3" /> Ver Diagnóstico
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setShowApproachModal(true)}>
                          <MessageCircle className="h-3 w-3" /> Abordagem
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky footer for selection */}
      {selected.size > 0 && !analysisRunning && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <span className="text-sm font-medium">{selected.size} lead{selected.size > 1 ? "s" : ""} selecionado{selected.size > 1 ? "s" : ""}</span>
            <Button className="gap-2" onClick={runAnalysisQueue}><Search className="h-4 w-4" /> Analisar Selecionados</Button>
          </div>
        </div>
      )}

      {/* Approach Modal */}
      <Dialog open={showApproachModal} onOpenChange={setShowApproachModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Abordagem</DialogTitle>
            <DialogDescription>Funcionalidade de abordagem em breve</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Estamos preparando ferramentas de abordagem automatizada para seus leads. Em breve você poderá enviar mensagens personalizadas diretamente por aqui.</p>
          <Button variant="outline" onClick={() => setShowApproachModal(false)}>Fechar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
