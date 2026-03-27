import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, Search, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  video_url: string | null;
  order_index: number;
}

const levelColors: Record<string, string> = {
  iniciante: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  intermediario: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  avancado: "bg-red-500/15 text-red-400 border-red-500/20",
};

const levelLabels: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const categoryLabels: Record<string, string> = {
  inicio: "Início",
  financeiro: "Financeiro",
  whatsapp: "WhatsApp",
  analytics: "Analytics",
  vendas: "Vendas",
  intelligence: "Inteligência",
};

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TutoriaisPage = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [level, setLevel] = useState("todos");
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("tutorials").select("*").eq("is_published", true).order("order_index");
      if (category !== "todos") query = query.eq("category", category);
      if (level !== "todos") query = query.eq("level", level);
      const { data } = await query;
      setTutorials((data as Tutorial[]) || []);
      setLoading(false);
    };
    fetch();
  }, [category, level]);

  const filtered = tutorials.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <p className="text-xs text-muted-foreground">Sistema &gt; Tutoriais</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20">
            <PlayCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Tutoriais</h1>
            <p className="text-sm text-muted-foreground">Aprenda a usar cada funcionalidade com vídeos passo a passo</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="inicio">Início</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              <SelectItem value="iniciante">Iniciante</SelectItem>
              <SelectItem value="intermediario">Intermediário</SelectItem>
              <SelectItem value="avancado">Avançado</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar tutorial..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PlayCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum tutorial encontrado</h3>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou a busca</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="bg-card border border-border overflow-hidden hover:border-primary/30 transition-all group cursor-pointer" onClick={() => setSelectedTutorial(t)}>
                {/* Thumbnail */}
                <div className="relative h-40 bg-muted flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" />
                  <PlayCircle className="h-12 w-12 text-white/70 group-hover:text-primary group-hover:scale-110 transition-all z-10" />
                  <div className="absolute bottom-2 left-2 flex gap-1.5 z-10">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${levelColors[t.level] || levelColors.iniciante}`}>
                      {levelLabels[t.level] || t.level}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-black/40 text-white/80 border-white/10">
                      {categoryLabels[t.category] || t.category}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 text-[10px] text-white/70">
                    <Clock className="h-3 w-3" /> {formatDuration(t.duration_seconds)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">{t.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  <Progress value={0} className="mt-3 h-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Dialog */}
        <Dialog open={!!selectedTutorial} onOpenChange={() => setSelectedTutorial(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTutorial?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedTutorial?.description}</p>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${levelColors[selectedTutorial?.level || ""] || ""}`}>
                  {levelLabels[selectedTutorial?.level || ""] || selectedTutorial?.level}
                </span>
                <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatDuration(selectedTutorial?.duration_seconds || 0)}
                </span>
              </div>
              {selectedTutorial?.video_url && (
                <Button asChild className="w-full gap-2">
                  <a href={selectedTutorial.video_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Assistir no YouTube
                  </a>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TutoriaisPage;
