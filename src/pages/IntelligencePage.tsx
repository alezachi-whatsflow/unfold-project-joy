import { useState } from "react";
import { Radar } from "lucide-react";
import { SearchForm } from "@/components/intelligence/SearchForm";
import { WebAnalysisCard } from "@/components/intelligence/WebAnalysisCard";
import { AuthorityDiagnosticCard } from "@/components/intelligence/AuthorityDiagnosticCard";
import { AnalysisHistory } from "@/components/intelligence/AnalysisHistory";
import { SocialPlaceholderCard } from "@/components/intelligence/SocialPlaceholderCard";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { SourceType, WebScrap, AuthorityDiagnostic, AUTHORITY_PILLARS } from "@/types/intelligence";
import { useToast } from "@/hooks/use-toast";

export default function IntelligencePage() {
  const {
    webScraps,
    profiles,
    leads,
    currentDiagnostic,
    currentStatus,
    addWebScrap,
    setDiagnostic,
    setCurrentStatus,
  } = useIntelligence();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const latestScrap = webScraps[0] ?? null;

  const handleSearch = async (query: string, sourceType: SourceType) => {
    if (sourceType !== "website") {
      toast({
        title: "Em breve",
        description: `A análise de ${sourceType} ainda não está disponível. Configure a API correspondente.`,
      });
      return;
    }

    setIsLoading(true);
    setCurrentStatus("scraping");

    try {
      // Simulate scraping for now (will be replaced by Firecrawl edge function)
      await new Promise((r) => setTimeout(r, 2000));

      const mockScrap: WebScrap = {
        id: crypto.randomUUID(),
        url: query.startsWith("http") ? query : `https://${query}`,
        title: `${query} - Site Analisado`,
        description: "Descrição extraída automaticamente do site via meta tags.",
        keywords: ["SaaS", "tecnologia", "automação"],
        technologies: ["React", "Node.js", "Tailwind CSS"],
        value_proposition: "Plataforma líder em automação de processos com inteligência artificial.",
        niche: "Automação & IA",
        contact_email: "contato@exemplo.com",
        contact_phone: "+55 11 99999-0000",
        raw_markdown: null,
        scraped_at: new Date().toISOString(),
        status: "completed",
      };

      addWebScrap(mockScrap);
      setCurrentStatus("analyzing");

      // Simulate AI diagnostic
      await new Promise((r) => setTimeout(r, 1500));

      const mockDiagnostic: AuthorityDiagnostic = {
        overallScore: 7.2,
        pillars: AUTHORITY_PILLARS.map((pillar, i) => ({
          pillar,
          score: Math.round((5 + Math.random() * 5) * 10) / 10,
          notes: `Análise automática do pilar "${pillar}" baseada nos dados coletados.`,
        })),
        summary: "Presença digital sólida com oportunidades de melhoria em conteúdo e conversão.",
      };

      setDiagnostic(mockDiagnostic);
      setCurrentStatus("completed");

      toast({ title: "Análise concluída", description: `${query} foi analisado com sucesso.` });
    } catch (err) {
      setCurrentStatus("error");
      toast({ title: "Erro", description: "Falha ao analisar. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          Digital Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Analise a autoridade digital de qualquer site, perfil ou negócio
        </p>
      </div>

      {/* Search */}
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />

      {/* Results Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Web Analysis Result */}
          {latestScrap && <WebAnalysisCard scrap={latestScrap} />}

          {/* Authority Diagnostic */}
          {currentDiagnostic && <AuthorityDiagnosticCard diagnostic={currentDiagnostic} />}

          {/* Placeholders for unavailable sources */}
          {!latestScrap && !currentDiagnostic && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SocialPlaceholderCard source="instagram" />
              <SocialPlaceholderCard source="linkedin" />
              <SocialPlaceholderCard source="google_maps" />
            </div>
          )}
        </div>

        {/* Sidebar - History */}
        <div>
          <AnalysisHistory webScraps={webScraps} profiles={profiles} leads={leads} />
        </div>
      </div>
    </div>
  );
}
