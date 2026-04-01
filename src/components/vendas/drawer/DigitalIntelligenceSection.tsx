import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radar, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { generateQuickReportHtml } from "@/components/intelligence/prospeccao/quickReportGenerator";
import type { Negocio } from "@/types/vendas";
import {
  getDigitalScoreFromNotas,
  getOrigemDetalheFromNotas,
  getSiteFromNotas,
  getPhoneFromNotas,
  getNicheFromNotas,
  getCityFromNotas,
  getScoreColor,
} from "../notesUtils";

interface DigitalIntelligenceSectionProps {
  negocio: Negocio;
}

export default function DigitalIntelligenceSection({ negocio }: DigitalIntelligenceSectionProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const diScore = getDigitalScoreFromNotas(negocio.notas);
  const origemDetalhe = getOrigemDetalheFromNotas(negocio.notas);

  const handleAnalyze = () => {
    const site = getSiteFromNotas(negocio.notas);
    if (site) {
      navigate(`/app/${slug || 'whatsflow'}/intelligence?analyze=${encodeURIComponent(site)}`);
    } else {
      navigate(`/app/${slug || 'whatsflow'}/intelligence?analyze=${encodeURIComponent(negocio.cliente_nome || negocio.titulo)}&type=google_maps`);
    }
  };

  const handleReport = () => {
    setIsGeneratingReport(true);
    try {
      const site = getSiteFromNotas(negocio.notas);
      const phone = getPhoneFromNotas(negocio.notas);
      const niche = getNicheFromNotas(negocio.notas) || "";
      const city = getCityFromNotas(negocio.notas) || "";
      const html = generateQuickReportHtml({
        leadName: negocio.cliente_nome || negocio.titulo,
        leadUrl: site,
        leadPhone: phone,
        leadDescription: null,
        score: diScore || 0,
        niche,
        city,
        hasSite: !!site,
        hasPhone: !!phone,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${(negocio.cliente_nome || negocio.titulo).replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório HTML gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <section className="p-3 border" style={{ borderColor: "#00C89640", backgroundColor: "#0D3D2E20" }}>
      <div className="flex items-center gap-2 mb-1">
        <Radar className="h-4 w-4" style={{ color: "#00C896" }} />
        <span className="text-xs font-semibold" style={{ color: "#00C896" }}>Digital Intelligence</span>
      </div>
      {origemDetalhe && (
        <p className="text-[11px] text-muted-foreground">{origemDetalhe}</p>
      )}
      {diScore !== null && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-muted-foreground">Score Digital:</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${getScoreColor(diScore)}20`, color: getScoreColor(diScore) }}>
            {diScore}/10
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          style={{ borderColor: "#00C896", color: "#00C896" }}
          onClick={handleAnalyze}
        >
          <Radar className="h-3 w-3" /> Analisar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          style={{ borderColor: "#00C896", color: "#00C896" }}
          disabled={isGeneratingReport}
          onClick={handleReport}
        >
          {isGeneratingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          Relatório
        </Button>
      </div>
    </section>
  );
}
