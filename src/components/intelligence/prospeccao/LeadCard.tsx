import { useState } from "react";
import { Globe, Phone, ExternalLink, Loader2, Plus, Check, Radar, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateQuickReportHtml } from "./quickReportGenerator";
import type { ProspectLead } from "../ProspeccaoTab";

const CRM_SENT_KEY = "crm_sent_leads";

interface Props {
  lead: ProspectLead;
  niche: string;
  city: string;
  onSentToCRM?: () => void;
}

type ScoreCategory = "hot" | "medium" | "low";

function getCategory(score: number): ScoreCategory {
  if (score >= 8) return "hot";
  if (score >= 5) return "medium";
  return "low";
}

const scoreMeta: Record<ScoreCategory, { label: string; color: string; bg: string }> = {
  hot: { label: "🔥 Oportunidade Quente", color: "text-green-400", bg: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Potencial Médio", color: "text-yellow-400", bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Baixa Prioridade", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground" },
};

const PIPELINE_STAGES = [
  { label: "Prospecção", value: "prospeccao" },
  { label: "Qualificado", value: "qualificado" },
  { label: "Proposta Enviada", value: "proposta" },
  { label: "Em Negociação", value: "negociacao" },
];

function getSentLeads(): Record<string, { stage: string; negocioId?: string }> {
  try {
    return JSON.parse(localStorage.getItem(CRM_SENT_KEY) || "{}");
  } catch { return {}; }
}

function markLeadSent(leadId: string, stage: string, negocioId: string) {
  const data = getSentLeads();
  data[leadId] = { stage, negocioId };
  localStorage.setItem(CRM_SENT_KEY, JSON.stringify(data));
}

export function getCRMSentCount(): number {
  return Object.keys(getSentLeads()).length;
}

export function LeadCard({ lead, niche, city, onSentToCRM }: Props) {
  const cat = getCategory(lead.score);
  const meta = scoreMeta[cat];
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const savedData = getSentLeads()[lead.id];
  const [sentStage, setSentStage] = useState<string | null>(savedData?.stage ?? null);
  const [sentNegocioId, setSentNegocioId] = useState<string | null>(savedData?.negocioId ?? null);
  const isSent = sentStage !== null;

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("prospeccao");
  const [responsible, setResponsible] = useState("Eu (usuário logado)");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const stageLabel = PIPELINE_STAGES.find(s => s.value === (sentStage || stage))?.label || sentStage;

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      const valor = parseFloat(estimatedValue.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      const origemDetalhe = `Digital Intelligence — ${niche} — ${city}`;
      
      const { data, error } = await supabase.from("negocios").insert({
        titulo: lead.name,
        status: stage,
        origem: "digital_intelligence",
        cliente_nome: lead.name,
        consultor_id: user?.id || null,
        consultor_nome: user?.user_metadata?.full_name || user?.email || null,
        valor_total: valor,
        valor_liquido: valor,
        probabilidade: lead.score >= 8 ? 70 : lead.score >= 5 ? 50 : 30,
        tags: ["Digital Intelligence"],
        notas: [
          `Origem: ${origemDetalhe}`,
          `Score Digital: ${lead.score}/10`,
          lead.phone ? `Telefone: ${lead.phone}` : null,
          lead.url ? `Site: ${lead.url}` : null,
          `Segmento: ${niche}`,
          `Cidade: ${city}`,
        ].filter(Boolean).join("\n"),
        historico: [{
          id: crypto.randomUUID(),
          data: new Date().toISOString(),
          tipo: "status_change",
          descricao: `Lead importado do Digital Intelligence — Score: ${lead.score}/10 — ${niche} em ${city}`,
          usuarioId: user?.id || "",
          usuarioNome: user?.user_metadata?.full_name || user?.email || "",
        }],
      } as any).select("id").single();

      if (error) throw error;

      const negocioId = data?.id;
      markLeadSent(lead.id, stage, negocioId);
      setSentStage(stage);
      setSentNegocioId(negocioId);
      setOpen(false);
      setEstimatedValue("");
      onSentToCRM?.();
      
      toast({
        title: "✅ Lead enviado para o Pipeline!",
        description: `"${lead.name}" → ${PIPELINE_STAGES.find(s => s.value === stage)?.label}`,
        action: (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs shrink-0"
            style={{ borderColor: "#00C896", color: "#00C896" }}
            onClick={() => navigate(`/vendas?highlight=${negocioId}`)}
          >
            <ExternalLink className="h-3 w-3" /> Ver no CRM
          </Button>
        ),
      });
    } catch (err: any) {
      console.error("CRM send error:", err);
      toast({ title: "Não foi possível enviar para o CRM. Tente novamente.", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleViewInCRM = () => {
    navigate(`/vendas?highlight=${sentNegocioId}`);
  };

  // Navigate to Intelligence page with URL pre-filled for analysis
  const handleAnalyze = () => {
    if (lead.url) {
      navigate(`/intelligence?analyze=${encodeURIComponent(lead.url)}`);
    } else {
      navigate(`/intelligence?analyze=${encodeURIComponent(lead.name)}&type=google_maps`);
    }
  };

  // Generate a quick HTML report for this lead
  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    try {
      const html = generateQuickReportHtml({
        leadName: lead.name,
        leadUrl: lead.url || null,
        leadPhone: lead.phone || null,
        leadDescription: lead.description || null,
        score: lead.score,
        niche,
        city,
        hasSite: lead.hasSite,
        hasPhone: lead.hasPhone,
      });

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${lead.name.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Relatório gerado!", description: "O arquivo HTML foi baixado. Envie ao cliente por e-mail ou WhatsApp." });
    } catch (err: any) {
      console.error("Report error:", err);
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Card className="relative">
      {/* Score badge */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        <Badge className={scoreMeta[cat].bg}>{lead.score}/10</Badge>
        {isSent && (
          <Badge className="text-[10px] py-0.5 px-1.5 border-0" style={{ backgroundColor: "#0D3D2E", color: "#00C896" }}>
            <Check className="h-2.5 w-2.5 mr-0.5" /> No CRM · {stageLabel}
          </Badge>
        )}
      </div>

      <CardContent className="pt-5 space-y-3">
        <div className="pr-20">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          {lead.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lead.description}</p>
          )}
        </div>

        {lead.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> {lead.phone}
          </p>
        )}

        <div className="flex gap-3 pt-1 border-t border-border items-center">
          <span className={lead.hasSite ? "text-primary" : "text-muted-foreground/40"}><Globe className="h-4 w-4" /></span>
          <span className={lead.hasPhone ? "text-primary" : "text-muted-foreground/40"}><Phone className="h-4 w-4" /></span>
        </div>

        <div className="pt-2 border-t border-border space-y-2">
          <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>

          {/* CRM Button */}
          {isSent ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs"
              style={{ borderColor: "#00C896", color: "#00C896" }}
              onClick={handleViewInCRM}
            >
              <ExternalLink className="h-3 w-3" /> Ver no CRM →
            </Button>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="w-full gap-1 text-xs text-white" style={{ backgroundColor: "#00C896" }}>
                  <Plus className="h-3 w-3" /> Enviar para CRM
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="center" side="top">
                <div className="space-y-3">
                  <p className="font-semibold text-sm">Enviar para o Pipeline de Vendas</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Etapa do Pipeline</Label>
                    <Select value={stage} onValueChange={setStage}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Responsável</Label>
                    <Select value={responsible} onValueChange={setResponsible}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Eu (usuário logado)" className="text-xs">Eu (usuário logado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor estimado</Label>
                    <Input className="h-8 text-xs" placeholder="R$ 0,00" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value.replace(/[^0-9.,]/g, ""))} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setOpen(false)} disabled={isSending}>Cancelar</Button>
                    <Button size="sm" className="flex-1 text-xs h-8 text-white gap-1" style={{ backgroundColor: "#00C896" }} onClick={handleConfirm} disabled={isSending}>
                      {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      {isSending ? "Enviando..." : "Confirmar"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Action buttons row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Analyze button */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              style={{ borderColor: "#00C896", color: "#00C896" }}
              onClick={handleAnalyze}
            >
              <Radar className="h-3 w-3" /> Analisar
            </Button>

            {/* Generate Report button */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              style={{ borderColor: "#00C896", color: "#00C896" }}
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Relatório
            </Button>
          </div>

          {/* Visit site button */}
          {lead.url && (
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs" style={{ borderColor: "#00C896", color: "#00C896" }} asChild>
              <a href={lead.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> Visitar Site</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
