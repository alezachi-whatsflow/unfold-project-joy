import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LegalDataAnalysis } from "@/types/analysisModules";
import { cn } from "@/lib/utils";

interface LegalDataCardProps {
  analysis: LegalDataAnalysis;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "presente") return <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />;
  if (status === "incompleto" || status === "formato_incorreto") return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
}

export function LegalDataCard({ analysis }: LegalDataCardProps) {
  const scoreColor = analysis.score_prontidao >= 7 ? "text-primary" : analysis.score_prontidao >= 4 ? "text-warning" : "text-destructive";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-accent" />
          Dados Legais para Meta
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className={cn("font-display text-lg font-bold", scoreColor)}>{analysis.score_prontidao.toFixed(1)}/10</span>
          <p className="text-[11px] text-muted-foreground">{analysis.resumo}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items table */}
        <div className="space-y-2">
          {analysis.itens.map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-secondary/30 p-2.5">
              <StatusIcon status={item.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{item.dado}</span>
                  <Badge variant="outline" className={cn("text-[9px]",
                    item.impacto_meta === "Bloqueante para verificação" ? "text-destructive" : item.impacto_meta === "Importante" ? "text-warning" : "text-muted-foreground"
                  )}>
                    {item.impacto_meta}
                  </Badge>
                </div>
                {item.valor_encontrado && (
                  <p className="text-[11px] text-accent mt-0.5 truncate">{item.valor_encontrado}</p>
                )}
                {item.alerta && (
                  <p className="text-[10px] text-destructive mt-0.5">{item.alerta}</p>
                )}
                {item.acao_corretiva && item.status !== "presente" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">→ {item.acao_corretiva}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Coherence */}
        <div className="border border-border bg-secondary/20 p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Coerência dos Dados</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Domínio vs Razão Social:</span>
            <Badge variant="outline" className={cn("text-[9px]",
              analysis.coerencia_dados.nome_dominio_vs_razao_social === "Coerente" ? "text-primary" : "text-warning"
            )}>
              {analysis.coerencia_dados.nome_dominio_vs_razao_social}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{analysis.coerencia_dados.observacao}</p>
        </div>

        {/* Footer template */}
        <div className="border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs font-semibold text-accent mb-1">{analysis.onde_adicionar_dados.recomendacao}</p>
          <p className="text-[11px] text-foreground font-mono bg-secondary/50 p-2 rounded">{analysis.onde_adicionar_dados.modelo_rodape}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{analysis.onde_adicionar_dados.importancia}</p>
        </div>
      </CardContent>
    </Card>
  );
}
