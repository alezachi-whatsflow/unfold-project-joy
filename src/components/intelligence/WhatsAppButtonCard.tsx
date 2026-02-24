import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButtonAnalysis } from "@/types/analysisModules";
import { cn } from "@/lib/utils";

interface WhatsAppButtonCardProps {
  analysis: WhatsAppButtonAnalysis;
}

export function WhatsAppButtonCard({ analysis }: WhatsAppButtonCardProps) {
  const scoreColor = analysis.score_acessibilidade >= 7 ? "text-primary" : analysis.score_acessibilidade >= 5 ? "text-warning" : "text-destructive";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-primary" />
          Botão WhatsApp
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={analysis.encontrado ? "default" : "destructive"} className="text-[10px]">
            {analysis.encontrado ? analysis.configuracao_atual.tipo : "Não encontrado"}
          </Badge>
          <span className={cn("font-display text-lg font-bold", scoreColor)}>
            {analysis.score_acessibilidade.toFixed(1)}/10
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current config */}
        {analysis.encontrado && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Posição", value: analysis.configuracao_atual.posicao },
              { label: "Label texto", value: analysis.configuracao_atual.tem_label_texto ? "Sim" : "Não" },
              { icon: Monitor, label: "Desktop", value: analysis.configuracao_atual.visivel_desktop },
              { icon: Smartphone, label: "Mobile", value: analysis.configuracao_atual.visivel_mobile },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-secondary/30 p-2">
                {typeof item.value === "boolean" ? (
                  item.value ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />
                ) : null}
                <span className="text-[11px] text-foreground">
                  {item.label}: {typeof item.value === "string" ? item.value : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Problems */}
        {analysis.problemas_detectados.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-destructive">Problemas</p>
            {analysis.problemas_detectados.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-foreground bg-destructive/5 rounded p-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                {p}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {analysis.recomendacoes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Recomendações</p>
            {analysis.recomendacoes.map((rec, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">{rec.acao}</p>
                  <Badge variant={rec.impacto_conversao === "Alto" ? "default" : "secondary"} className="text-[9px]">
                    {rec.impacto_conversao}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{rec.por_que}</p>
                <p className="text-[11px] text-accent">{rec.como_implementar}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ideal config */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Configuração Ideal</p>
          <div className="grid gap-1.5">
            {Object.entries(analysis.configuracao_ideal).map(([key, val]) => (
              <div key={key} className="flex items-start gap-1.5 text-[11px] text-foreground">
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                {val}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
