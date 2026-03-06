import { useState } from "react";
import { Save, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DigitalAnalysisData } from "@/lib/digitalAnalysisHtmlGenerator";
import { ExportAnalysisDialog } from "./ExportAnalysisDialog";
import { useToast } from "@/hooks/use-toast";
import { ChannelThreshold } from "@/types/rescuePlan";
import { WebScrap, ProfileAnalysis, BusinessLead } from "@/types/intelligence";
import { MetaVerificationResult, WhatsAppButtonAnalysis, NeuromarketingAnalysis } from "@/types/analysisModules";

interface SaveAnalysisButtonProps {
  overallThreshold: ChannelThreshold | null;
  websiteThreshold: ChannelThreshold | null;
  instagramThreshold: ChannelThreshold | null;
  gmnThreshold: ChannelThreshold | null;
  metaThreshold: ChannelThreshold | null;
  whatsappThreshold: ChannelThreshold | null;
  neuroThreshold: ChannelThreshold | null;
  latestScrap: WebScrap | null;
  latestProfile: ProfileAnalysis | null;
  googleBusiness: any | null;
  metaResult: MetaVerificationResult | null;
  whatsappResult: WhatsAppButtonAnalysis | null;
  neuroResult: NeuromarketingAnalysis | null;
}

export function SaveAnalysisButton({
  overallThreshold, websiteThreshold, instagramThreshold, gmnThreshold,
  metaThreshold, whatsappThreshold, neuroThreshold,
  latestScrap, latestProfile, googleBusiness,
  metaResult, whatsappResult, neuroResult,
}: SaveAnalysisButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState<DigitalAnalysisData | null>(null);
  const [showExport, setShowExport] = useState(false);
  const { toast } = useToast();

  if (!overallThreshold) return null;

  const companyName =
    googleBusiness?.name ||
    latestScrap?.title ||
    latestProfile?.display_name ||
    latestProfile?.username ||
    "Empresa";

  const buildDetailsJson = () => {
    const details: Record<string, any> = {};

    if (latestScrap) {
      details.website = {
        checks: [
          { label: "Título presente", passed: !!latestScrap.title },
          { label: "Descrição presente", passed: !!latestScrap.description },
          { label: "Palavras-chave definidas", passed: !!(latestScrap.keywords?.length) },
          { label: "Proposta de valor clara", passed: !!latestScrap.value_proposition },
          { label: "E-mail de contato", passed: !!latestScrap.contact_email },
          { label: "Telefone de contato", passed: !!latestScrap.contact_phone },
        ],
        recommendation: "Otimize SEO on-page e garanta que proposta de valor esteja clara na primeira dobra.",
      };
    }

    if (latestProfile) {
      const eng = latestProfile.avg_engagement_rate;
      details.instagram = {
        checks: [
          { label: "Bio preenchida", passed: !!latestProfile.bio },
          { label: "Foto de perfil", passed: !!latestProfile.profile_image_url },
          { label: "Mais de 1000 seguidores", passed: (latestProfile.followers ?? 0) > 1000 },
          { label: "Taxa de engajamento > 2%", passed: eng !== null && eng > 2 },
          { label: "Posts regulares (>10)", passed: (latestProfile.posts_count ?? 0) > 10 },
        ],
        recommendation: "Foque em conteúdo de valor e consistência para melhorar engajamento.",
      };
    }

    if (googleBusiness) {
      details.google_business = {
        checks: [
          { label: "Nome da empresa", passed: !!googleBusiness.name },
          { label: "Endereço cadastrado", passed: !!googleBusiness.address },
          { label: "Telefone disponível", passed: !!googleBusiness.phone },
          { label: "Website vinculado", passed: !!googleBusiness.website },
          { label: "Avaliação ≥ 4.0", passed: (googleBusiness.rating ?? 0) >= 4 },
          { label: "Mais de 10 avaliações", passed: (googleBusiness.reviews_count ?? 0) > 10 },
        ],
        recommendation: "Incentive avaliações dos clientes e mantenha informações atualizadas.",
      };
    }

    if (metaResult) {
      details.meta = {
        checks: [
          { label: "Domínio verificado", passed: metaResult.domain_verification.score >= 7 },
          { label: "Negócio verificado", passed: metaResult.business_verification.score >= 7 },
        ],
        recommendation: "Complete a verificação de domínio e negócio no Meta Business Suite.",
      };
    }

    if (whatsappResult) {
      details.whatsapp = {
        checks: [
          { label: "Botão de WhatsApp encontrado", passed: whatsappResult.encontrado },
          { label: "Visível no mobile", passed: whatsappResult.configuracao_atual.visivel_mobile },
          { label: "Contraste adequado", passed: whatsappResult.configuracao_atual.contraste_adequado },
        ],
        recommendation: whatsappResult.recomendacoes?.[0]?.acao || "Adicione um botão de WhatsApp acessível no site.",
      };
    }

    if (neuroResult) {
      details.neuro = {
        checks: [
          { label: "CTA claro identificado", passed: neuroResult.score_geral >= 5 },
          { label: "Hierarquia visual adequada", passed: neuroResult.score_geral >= 6 },
          { label: "Design persuasivo", passed: neuroResult.score_geral >= 7 },
        ],
        recommendation: neuroResult.top5_melhorias_neuromarketing?.[0]?.melhoria || "Aplique princípios de neuromarketing no design.",
      };
    }

    return details;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const row = {
        company_name: companyName,
        category: googleBusiness?.category || latestScrap?.niche || null,
        overall_score: overallThreshold.score,
        overall_label: overallThreshold.label,
        score_website: websiteThreshold?.score ?? null,
        score_instagram: instagramThreshold?.score ?? null,
        score_google_business: gmnThreshold?.score ?? null,
        score_meta: metaThreshold?.score ?? null,
        score_whatsapp: whatsappThreshold?.score ?? null,
        score_neuro: neuroThreshold?.score ?? null,
        details_json: buildDetailsJson(),
        address: googleBusiness?.address ?? null,
        phone: googleBusiness?.phone ?? latestScrap?.contact_phone ?? null,
        website_url: latestScrap?.url ?? googleBusiness?.website ?? null,
        total_reviews: googleBusiness?.reviews_count ?? null,
        avg_rating: googleBusiness?.rating ?? null,
      };

      const { data, error } = await supabase
        .from("digital_analyses")
        .insert(row)
        .select()
        .single();

      if (error) throw error;

      setSavedAnalysis(data as DigitalAnalysisData);
      toast({ title: "Análise salva!", description: "Você pode exportar o relatório HTML agora." });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Análise
      </Button>

      {savedAnalysis && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowExport(true)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar HTML
          </Button>
          <ExportAnalysisDialog
            analysis={savedAnalysis}
            open={showExport}
            onOpenChange={setShowExport}
          />
        </>
      )}
    </div>
  );
}
