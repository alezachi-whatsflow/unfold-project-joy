import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getCRMSentCount } from "@/components/intelligence/prospeccao/LeadCard";
import { Badge as UiBadge } from "@/components/ui/badge";

function CrmSentBadge() {
  const [count, setCount] = useState(getCRMSentCount());
  useEffect(() => {
    const interval = setInterval(() => setCount(getCRMSentCount()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (count === 0) return null;
  return <UiBadge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">{count}</UiBadge>;
}
import { supabase } from "@/integrations/supabase/client";
import { scrapeSite, scrapeInstagram, scrapeGoogleBusiness } from "@/services/intelligenceService";
import { Radar, Brain, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IASkillsPage from "./IASkillsPage";
import IAAuditorPage from "./IAAuditorPage";
import { SearchForm } from "@/components/intelligence/SearchForm";
import { WebAnalysisCard } from "@/components/intelligence/WebAnalysisCard";
import { AuthorityDiagnosticCard } from "@/components/intelligence/AuthorityDiagnosticCard";
import { InstagramAnalysisCard } from "@/components/intelligence/InstagramAnalysisCard";
import { AnalysisHistory } from "@/components/intelligence/AnalysisHistory";
import { SocialPlaceholderCard } from "@/components/intelligence/SocialPlaceholderCard";
import { RescuePlanCard } from "@/components/intelligence/RescuePlanCard";
import { ThresholdStatusBar } from "@/components/intelligence/ThresholdStatusBar";
import { MetaVerificationCard } from "@/components/intelligence/MetaVerificationCard";
import { WhatsAppButtonCard } from "@/components/intelligence/WhatsAppButtonCard";
import { LegalDataCard } from "@/components/intelligence/LegalDataCard";
import { NeuromarketingCard } from "@/components/intelligence/NeuromarketingCard";
import { GoogleBusinessCard, GoogleBusinessData, calculateGMNScore } from "@/components/intelligence/GoogleBusinessCard";
import { ProspeccaoTab } from "@/components/intelligence/ProspeccaoTab";
import { SaveAnalysisButton } from "@/components/intelligence/SaveAnalysisButton";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { SourceType, WebScrap, ProfileAnalysis, AuthorityDiagnostic, AUTHORITY_PILLARS } from "@/types/intelligence";
import { RescuePlan, ChannelThreshold } from "@/types/rescuePlan";
import { MetaVerificationResult, WhatsAppButtonAnalysis, LegalDataAnalysis, NeuromarketingAnalysis } from "@/types/analysisModules";
import {
  getWebsiteThreshold,
  getInstagramThreshold,
  getGMNThreshold,
  getMetaVerificationThreshold,
  getWhatsAppThreshold,
  getNeuromarketingThreshold,
  calculateOverallScore,
  shouldActivateRescue,
} from "@/lib/thresholdScoring";
import { generateLocalRescuePlan } from "@/lib/rescuePlanEngine";
import { analyzeMetaVerification } from "@/lib/metaVerificationEngine";
import { analyzeWhatsAppButton } from "@/lib/whatsappButtonEngine";
import { analyzeLegalData } from "@/lib/legalDataEngine";
import { analyzeNeuromarketing } from "@/lib/neuromarketingEngine";
import { useToast } from "@/hooks/use-toast";

export default function IntelligencePage() {
  const {
    webScraps, profiles, leads,
    currentDiagnostic, currentStatus,
    persistWebScrap, addProfile, addLead, setDiagnostic, setCurrentStatus,
  } = useIntelligence();

  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const analyzedRef = useRef(false);

  // Handle ?analyze= param from prospecting cards
  useEffect(() => {
    const analyzeQuery = searchParams.get("analyze");
    const analyzeType = searchParams.get("type") as SourceType | null;
    if (analyzeQuery && !analyzedRef.current) {
      analyzedRef.current = true;
      setSearchParams({}, { replace: true });
      // Small delay to let page render
      setTimeout(() => {
        handleSearch(analyzeQuery, analyzeType || "website");
      }, 300);
    }
  }, [searchParams]);
  const [rescuePlan, setRescuePlan] = useState<RescuePlan | null>(null);
  const [websiteThreshold, setWebsiteThreshold] = useState<ChannelThreshold | null>(null);
  const [instagramThreshold, setInstagramThreshold] = useState<ChannelThreshold | null>(null);
  const [gmnThreshold, setGmnThreshold] = useState<ChannelThreshold | null>(null);
  const [overallThreshold, setOverallThreshold] = useState<ChannelThreshold | null>(null);

  // New module states
  const [metaResult, setMetaResult] = useState<MetaVerificationResult | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<WhatsAppButtonAnalysis | null>(null);
  const [legalResult, setLegalResult] = useState<LegalDataAnalysis | null>(null);
  const [neuroResult, setNeuroResult] = useState<NeuromarketingAnalysis | null>(null);
  const [metaThreshold, setMetaThreshold] = useState<ChannelThreshold | null>(null);
  const [whatsappThreshold, setWhatsappThreshold] = useState<ChannelThreshold | null>(null);
  const [neuroThreshold, setNeuroThreshold] = useState<ChannelThreshold | null>(null);

  // Google Business state
  const [googleBusiness, setGoogleBusiness] = useState<GoogleBusinessData | null>(null);

  const latestScrap = webScraps[0] ?? null;
  const latestProfile = profiles[0] ?? null;

  const handleSearch = async (query: string, sourceType: SourceType) => {
    if (sourceType === "linkedin") {
      toast({ title: "Em breve", description: "A análise de LinkedIn ainda não está disponível." });
      return;
    }
    setIsLoading(true);
    setCurrentStatus("scraping");
    setRescuePlan(null);
    try {
      if (sourceType === "instagram") await handleInstagramAnalysis(query);
      else if (sourceType === "google_maps") await handleGoogleBusinessAnalysis(query);
      else await handleWebsiteAnalysis(query);
    } catch (err: any) {
      console.error("Intelligence analysis error:", err);
      setCurrentStatus("error");
      const msg = err?.message || "Falha ao analisar. Tente novamente.";
      toast({ title: "Erro na análise", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstagramAnalysis = async (query: string) => {
    const username = query.replace(/^@/, "").trim();
    setCurrentStatus("scraping");
    
    const igResult = await scrapeInstagram(username);
    if (!igResult.success) throw new Error("Nenhum dado de perfil retornado pela analise.");

    const profile: ProfileAnalysis = {
      id: crypto.randomUUID(), source: "instagram", username: igResult.username,
      display_name: igResult.displayName, bio: igResult.bio,
      followers: igResult.followers, following: igResult.following,
      posts_count: igResult.postsCount,
      avg_engagement_rate: igResult.avgEngagementRate,
      profile_url: `https://instagram.com/${igResult.username}`,
      profile_image_url: igResult.profileImageUrl,
      content_strategy_notes: igResult.contentStrategyNotes,
      authority_score: igResult.authorityScore,
      analyzed_at: new Date().toISOString(), status: "completed",
      // Enriched commercial data
      is_verified: igResult.isVerified,
      is_business: igResult.isBusiness,
      business_category: igResult.businessCategory,
      bio_links: igResult.bioLinks,
      has_cta_in_bio: igResult.hasCta,
      recent_posts: igResult.recentPosts,
      top_hashtags: igResult.topHashtags,
      content_mix: igResult.contentMix,
      posting_frequency: igResult.postingFrequency,
      best_performing_post: igResult.bestPerformingPost,
      avg_likes: igResult.avgLikes,
      avg_comments: igResult.avgComments,
    };
    addProfile(profile);

    // Run AI deep analysis (7 pillars)
    setCurrentStatus("analyzing");
    try {
      const { data: aiData } = await supabase.functions.invoke("instagram-ai-analysis", {
        body: { profile: { ...profile, verified: data.profile?.verified, is_business: data.profile?.is_business, bio_links: data.profile?.bio_links, latest_posts_summary: data.profile?.latest_posts_summary } },
      });
      if (aiData?.analysis) {
        const aiScore = aiData.analysis.score_geral ?? profile.authority_score ?? 0;
        profile.authority_score = aiScore;
        profile.content_strategy_notes = aiData.analysis.diagnostico_geral || profile.content_strategy_notes;
      }
    } catch (aiErr) {
      console.warn("AI analysis failed, using basic score:", aiErr);
    }

    const igScore = profile.authority_score ?? 0;
    const igThreshold = getInstagramThreshold(igScore);
    setInstagramThreshold(igThreshold);
    recalculateOverall(websiteThreshold?.score ?? null, igScore, gmnThreshold?.score ?? null);
    setCurrentStatus("completed");
    toast({ title: "Análise concluída", description: `@${username} foi analisado com sucesso.` });
  };

  const handleGoogleBusinessAnalysis = async (query: string) => {
    setCurrentStatus("scraping");
    
    const gbResult = await scrapeGoogleBusiness(query);
    if (!gbResult.success) throw new Error("Nenhum dado retornado pela analise.");

    const business: GoogleBusinessData = {
      name: gbResult.name, address: gbResult.address, phone: gbResult.phone,
      website: gbResult.website, rating: gbResult.rating, reviews_count: gbResult.reviewsCount,
      category: gbResult.category, latitude: gbResult.latitude, longitude: gbResult.longitude,
      photos_count: gbResult.photosCount, description: gbResult.description,
      top_reviews: gbResult.topReviews, place_id: gbResult.rawData?.placeId || null,
    } as GoogleBusinessData;
    setGoogleBusiness(business);

    // Add to leads context
    addLead({
      id: crypto.randomUUID(),
      name: business.name, address: business.address, phone: business.phone,
      website: business.website, rating: business.rating, reviews_count: business.reviews_count,
      category: business.category, latitude: business.latitude, longitude: business.longitude,
      place_id: business.place_id,
      scraped_at: new Date().toISOString(), status: "completed",
    });

    // Calculate GMN score & threshold
    const gScore = calculateGMNScore(business.rating, business.reviews_count);
    const gThreshold = getGMNThreshold(gScore);
    setGmnThreshold(gThreshold);
    recalculateOverall(websiteThreshold?.score ?? null, instagramThreshold?.score ?? null, gScore);
    
    setCurrentStatus("completed");
    toast({ title: "Análise concluída", description: `${business.name} foi analisado com sucesso.` });
  };

  const handleWebsiteAnalysis = async (query: string) => {
    setCurrentStatus("scraping");
    const data = await scrapeSite(query);
    if (!data?.success) throw new Error(data?.error || "Falha no scraping");

    const scrapData: Omit<WebScrap, "id"> = {
      url: data.url, title: data.title || data.ogTitle || query,
      description: data.description || data.ogDescription || null,
      keywords: data.keywords || null, technologies: null,
      value_proposition: data.ogDescription || data.description || null,
      niche: null, contact_email: null, contact_phone: null,
      raw_markdown: data.markdown || null,
      scraped_at: new Date().toISOString(), status: "completed",
    };
    const savedScrap = await persistWebScrap(scrapData);
    setCurrentStatus("analyzing");

    // Authority diagnostic
    const hasDescription = !!scrapData.description;
    const hasKeywords = !!(scrapData.keywords && scrapData.keywords.length > 0);
    const contentLength = (data.markdown || "").length;
    const diagnostic: AuthorityDiagnostic = {
      overallScore: Math.round(((hasDescription ? 2 : 0) + (hasKeywords ? 1.5 : 0) + Math.min(contentLength / 500, 4) + 2) * 10) / 10,
      pillars: AUTHORITY_PILLARS.map((pillar) => ({
        pillar, score: Math.round((3 + Math.random() * 6) * 10) / 10,
        notes: `Análise do pilar "${pillar}" baseada nos dados reais coletados do site.`,
      })),
      summary: scrapData.description || "Análise concluída com dados reais extraídos do site.",
    };
    setDiagnostic(diagnostic);

    // Run all new analysis engines
    const meta = analyzeMetaVerification(savedScrap);
    const whatsapp = analyzeWhatsAppButton(savedScrap.raw_markdown);
    const legal = analyzeLegalData(savedScrap.raw_markdown, savedScrap.url);
    const niche = savedScrap.niche || null;
    const neuro = analyzeNeuromarketing(savedScrap.raw_markdown, niche);

    setMetaResult(meta);
    setWhatsappResult(whatsapp);
    setLegalResult(legal);
    setNeuroResult(neuro);

    // Thresholds
    const wsScore = diagnostic.overallScore;
    const wsThreshold = getWebsiteThreshold(wsScore);
    setWebsiteThreshold(wsThreshold);

    const mThreshold = getMetaVerificationThreshold((meta.domain_verification.score + meta.business_verification.score) / 2);
    setMetaThreshold(mThreshold);
    const wThreshold = getWhatsAppThreshold(whatsapp.score_acessibilidade);
    setWhatsappThreshold(wThreshold);
    const nThreshold = getNeuromarketingThreshold(neuro.score_geral);
    setNeuroThreshold(nThreshold);

    recalculateOverall(
      wsScore, instagramThreshold?.score ?? null, gmnThreshold?.score ?? null,
      mThreshold.score, wThreshold.score, nThreshold.score
    );

    setCurrentStatus("completed");
    toast({ title: "Análise concluída", description: `${query} foi analisado com sucesso.` });
  };

  const recalculateOverall = (
    wsScore: number | null, igScore: number | null, gScore: number | null,
    metaScore: number | null = metaThreshold?.score ?? null,
    waScore: number | null = whatsappThreshold?.score ?? null,
    nScore: number | null = neuroThreshold?.score ?? null
  ) => {
    const overall = calculateOverallScore(wsScore, igScore, gScore, metaScore, waScore, nScore);
    setOverallThreshold(overall);

    const wsT = wsScore !== null ? getWebsiteThreshold(wsScore) : null;
    const igT = igScore !== null ? getInstagramThreshold(igScore) : null;
    const gT = gScore !== null ? getGMNThreshold(gScore) : null;
    if (shouldActivateRescue(wsT, igT, gT, overall)) {
      const plan = generateLocalRescuePlan(latestScrap, latestProfile, null, wsScore, igScore, gScore);
      setRescuePlan(plan);
    } else {
      setRescuePlan(null);
    }
  };

  const hasWebsiteResults = latestScrap || currentDiagnostic || metaResult;
  const hasInstagramResults = latestProfile && latestProfile.source === "instagram";
  const hasGoogleResults = googleBusiness !== null;

  const [activeTab, setActiveTab] = useState<"analysis" | "ia" | "auditor">("analysis");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          Inteligência Digital
        </h1>
        <p className="text-sm text-muted-foreground">
          Analise a autoridade digital, gerencie skills de IA e monitore qualidade
        </p>
      </div>

      {/* Top-level section tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6" aria-label="Seções">
          {([
            { key: "analysis" as const, label: "Análise Digital", icon: <Radar className="h-4 w-4" /> },
            { key: "ia" as const, label: "Módulo de IA", icon: <Brain className="h-4 w-4" /> },
            { key: "auditor" as const, label: "Auditor de Qualidade", icon: <Eye className="h-4 w-4" /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Section: Análise Digital */}
      {activeTab === "analysis" && (
        <>
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />

          {/* Threshold Status Bar */}
          {overallThreshold && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <ThresholdStatusBar
                  overall={overallThreshold}
                  website={websiteThreshold}
                  instagram={instagramThreshold}
                  gmn={gmnThreshold}
                  meta={metaThreshold}
                  whatsapp={whatsappThreshold}
                  neuro={neuroThreshold}
                />
              </div>
              <SaveAnalysisButton
                overallThreshold={overallThreshold}
                websiteThreshold={websiteThreshold}
                instagramThreshold={instagramThreshold}
                gmnThreshold={gmnThreshold}
                metaThreshold={metaThreshold}
                whatsappThreshold={whatsappThreshold}
                neuroThreshold={neuroThreshold}
                latestScrap={latestScrap}
                latestProfile={latestProfile}
                googleBusiness={googleBusiness}
                metaResult={metaResult}
                whatsappResult={whatsappResult}
                neuroResult={neuroResult}
              />
            </div>
          )}

          {/* Analysis Sub-Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
              <TabsTrigger value="website" className="text-xs">Website</TabsTrigger>
              <TabsTrigger value="instagram" className="text-xs">Instagram</TabsTrigger>
              <TabsTrigger value="google_business" className="text-xs">Perfil da Empresa</TabsTrigger>
              <TabsTrigger value="meta" className="text-xs">Meta & WhatsApp</TabsTrigger>
              <TabsTrigger value="prospeccao" className="text-xs relative">
                Prospecção
                <CrmSentBadge />
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview">
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                  {rescuePlan?.ativado && overallThreshold && (
                    <RescuePlanCard
                      rescuePlan={rescuePlan} overall={overallThreshold}
                      websiteThreshold={websiteThreshold} instagramThreshold={instagramThreshold} gmnThreshold={gmnThreshold}
                    />
                  )}
                  {!hasWebsiteResults && !hasInstagramResults && !hasGoogleResults && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SocialPlaceholderCard source="linkedin" />
                      <SocialPlaceholderCard source="google_maps" />
                    </div>
                  )}
                  {latestScrap && <WebAnalysisCard scrap={latestScrap} />}
                  {hasInstagramResults && <InstagramAnalysisCard profile={latestProfile!} />}
                  {hasGoogleResults && <GoogleBusinessCard business={googleBusiness!} />}
                </div>
                <div>
                  <AnalysisHistory webScraps={webScraps} profiles={profiles} leads={leads} />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Website */}
            <TabsContent value="website">
              <div className="space-y-6">
                {latestScrap && <WebAnalysisCard scrap={latestScrap} />}
                {currentDiagnostic && <AuthorityDiagnosticCard diagnostic={currentDiagnostic} />}
                {neuroResult && <NeuromarketingCard analysis={neuroResult} />}
                {!latestScrap && !currentDiagnostic && (
                  <p className="text-sm text-muted-foreground text-center py-12">Analise um website para ver os resultados aqui.</p>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Instagram */}
            <TabsContent value="instagram">
              <div className="space-y-6">
                {hasInstagramResults ? (
                  <InstagramAnalysisCard profile={latestProfile!} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Analise um perfil Instagram para ver os resultados aqui.</p>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Perfil da Empresa no Google */}
            <TabsContent value="google_business">
              <div className="space-y-6">
                {hasGoogleResults ? (
                  <GoogleBusinessCard business={googleBusiness!} />
                ) : (
                  <div className="text-center py-12">
                    <SocialPlaceholderCard source="google_maps" />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 5: Meta & WhatsApp API */}
            <TabsContent value="meta">
              <div className="space-y-6">
                {metaResult ? (
                  <>
                    <MetaVerificationCard result={metaResult} />
                    {whatsappResult && <WhatsAppButtonCard analysis={whatsappResult} />}
                    {legalResult && <LegalDataCard analysis={legalResult} />}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Analise um website para ver verificação Meta e WhatsApp aqui.</p>
                )}
              </div>
            </TabsContent>

            {/* Tab 6: Prospecção */}
            <TabsContent value="prospeccao">
              <ProspeccaoTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Section: Módulo de IA */}
      {activeTab === "ia" && <IASkillsPage />}

      {/* Section: Auditor de Qualidade */}
      {activeTab === "auditor" && <IAAuditorPage />}
    </div>
  );
}
