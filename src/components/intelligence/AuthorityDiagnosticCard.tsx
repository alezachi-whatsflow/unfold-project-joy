import { Shield, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AuthorityDiagnostic } from "@/types/intelligence";
import { cn } from "@/lib/utils";

interface AuthorityDiagnosticCardProps {
  diagnostic: AuthorityDiagnostic;
}

function getScoreColor(score: number) {
  if (score >= 8) return "text-primary";
  if (score >= 5) return "text-warning";
  return "text-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 8) return "Excelente";
  if (score >= 6) return "Bom";
  if (score >= 4) return "Regular";
  return "Precisa melhorar";
}

export function AuthorityDiagnosticCard({ diagnostic }: AuthorityDiagnosticCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-primary" />
          Diagnóstico de Autoridade Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Score */}
        <div className="flex items-center gap-4 rounded-lg bg-secondary p-4">
          <div className="flex flex-col items-center">
            <span className={cn("font-display text-3xl font-bold", getScoreColor(diagnostic.overallScore))}>
              {diagnostic.overallScore.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 10</span>
          </div>
          <div className="flex-1">
            <p className={cn("text-sm font-medium", getScoreColor(diagnostic.overallScore))}>
              {getScoreLabel(diagnostic.overallScore)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{diagnostic.summary}</p>
          </div>
          <TrendingUp className={cn("h-8 w-8", getScoreColor(diagnostic.overallScore))} />
        </div>

        {/* Pillars */}
        <div className="space-y-3">
          {diagnostic.pillars.map((pillar) => (
            <div key={pillar.pillar} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">{pillar.pillar}</p>
                <span className={cn("font-display text-xs font-bold", getScoreColor(pillar.score))}>
                  {pillar.score}/10
                </span>
              </div>
              <Progress value={pillar.score * 10} className="h-1.5" />
              {pillar.notes && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{pillar.notes}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
