import { useState } from "react";
import { Radar } from "lucide-react";
import { SearchForm } from "@/components/intelligence/SearchForm";
import { WebAnalysisCard } from "@/components/intelligence/WebAnalysisCard";
import { AuthorityDiagnosticCard } from "@/components/intelligence/AuthorityDiagnosticCard";
import { InstagramAnalysisCard } from "@/components/intelligence/InstagramAnalysisCard";
import { AnalysisHistory } from "@/components/intelligence/AnalysisHistory";
import { SocialPlaceholderCard } from "@/components/intelligence/SocialPlaceholderCard";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { SourceType, WebScrap, ProfileAnalysis, AuthorityDiagnostic, AUTHORITY_PILLARS } from "@/types/intelligence";
import { useToast } from "@/hooks/use-toast";

export default function IntelligencePage() {
  const {
    webScraps,
    profiles,
    leads,
    currentDiagnostic,
    currentStatus,
    persistWebScrap,
    addProfile,
    setDiagnostic,
    setCurrentStatus,
  } = useIntelligence();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const latestScrap = webScraps[0] ?? null;
  const latestProfile = profiles[0] ?? null;

  const handleSearch = async (query: string, sourceType: SourceType) => {
    if (sourceType !== "website" && sourceType !== "instagram") {
      toast({
        title: "Em breve",
        description: `A análise de ${sourceType} ainda não está disponível. Configure a API correspondente.`,
      });
      return;
    }

    setIsLoading(true);
    setCurrentStatus("scraping");

    try {
      if (sourceType === "instagram") {
        await handleInstagramAnalysis(query);
      } else {
        await handleWebsiteAnalysis(query);
      }
    } catch (err) {
      setCurrentStatus("error");
      toast({ title: "Erro", description: "Falha ao analisar. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstagramAnalysis = async (query: string) => {
    const username = query.replace(/^@/, "").trim();

    // Simulate API call (will be replaced by Apify edge function)
    await new Promise((r) => setTimeout(r, 2500));
    setCurrentStatus("analyzing");

    // Generate realistic mock data
    const followers = Math.floor(5000 + Math.random() * 495000);
    const following = Math.floor(200 + Math.random() * 2000);
    const posts = Math.floor(50 + Math.random() * 1500);
    const engagementRate = Math.round((1 + Math.random() * 7) * 100) / 100;
    const authorityScore = Math.round((4 + Math.random() * 6) * 10) / 10;

    const strategies = [
      "Conteúdo predominantemente visual com foco em carrosséis educativos.",
      "Uso frequente de Reels com storytelling pessoal e calls-to-action.",
      "Mix de conteúdo: 40% educativo, 30% bastidores, 20% social proof, 10% vendas diretas.",
      "Estratégia de hashtags segmentada com 15-20 tags por post, combinando volume alto e nicho.",
      "Frequência de 4-5 posts/semana com stories diários e lives semanais.",
    ];
    const strategyNotes = strategies
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .join("\n• ");

    const mockProfile: ProfileAnalysis = {
      id: crypto.randomUUID(),
      source: "instagram",
      username,
      display_name: username.charAt(0).toUpperCase() + username.slice(1).replace(/[._]/g, " "),
      bio: `Perfil profissional no Instagram • Análise simulada para @${username}`,
      followers,
      following,
      posts_count: posts,
      avg_engagement_rate: engagementRate,
      profile_url: `https://instagram.com/${username}`,
      profile_image_url: null,
      content_strategy_notes: `• ${strategyNotes}`,
      authority_score: authorityScore,
      analyzed_at: new Date().toISOString(),
      status: "completed",
    };

    addProfile(mockProfile);
    setCurrentStatus("completed");
    toast({ title: "Análise concluída", description: `@${username} foi analisado com sucesso.` });
  };

  const handleWebsiteAnalysis = async (query: string) => {
    await new Promise((r) => setTimeout(r, 2000));

    const scrapData: Omit<WebScrap, "id"> = {
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

    await persistWebScrap(scrapData);
    setCurrentStatus("analyzing");

    await new Promise((r) => setTimeout(r, 1500));

    const mockDiagnostic: AuthorityDiagnostic = {
      overallScore: 7.2,
      pillars: AUTHORITY_PILLARS.map((pillar) => ({
        pillar,
        score: Math.round((5 + Math.random() * 5) * 10) / 10,
        notes: `Análise automática do pilar "${pillar}" baseada nos dados coletados.`,
      })),
      summary: "Presença digital sólida com oportunidades de melhoria em conteúdo e conversão.",
    };

    setDiagnostic(mockDiagnostic);
    setCurrentStatus("completed");
    toast({ title: "Análise concluída", description: `${query} foi analisado com sucesso.` });
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
          {/* Instagram Analysis Result */}
          {latestProfile && latestProfile.source === "instagram" && (
            <InstagramAnalysisCard profile={latestProfile} />
          )}

          {/* Web Analysis Result */}
          {latestScrap && <WebAnalysisCard scrap={latestScrap} />}

          {/* Authority Diagnostic */}
          {currentDiagnostic && <AuthorityDiagnosticCard diagnostic={currentDiagnostic} />}

          {/* Placeholders for unavailable sources */}
          {!latestScrap && !currentDiagnostic && !latestProfile && (
            <div className="grid gap-4 sm:grid-cols-2">
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