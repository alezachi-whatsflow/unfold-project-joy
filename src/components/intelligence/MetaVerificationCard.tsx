import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MetaVerificationResult } from "@/types/analysisModules";
import { cn } from "@/lib/utils";

interface MetaVerificationCardProps {
  result: MetaVerificationResult;
}

function StatusIcon({ status }: { status: "ok" | "pendente" | "ausente" }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />;
  if (status === "pendente") return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 7 ? "text-primary" : score >= 4 ? "text-warning" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none" strokeWidth="6" className="stroke-secondary" />
          <circle
            cx="40" cy="40" r="35" fill="none" strokeWidth="6"
            strokeDasharray={`${(score / 10) * 220} 220`}
            strokeLinecap="round"
            className={cn("transition-all duration-700", score >= 7 ? "stroke-primary" : score >= 4 ? "stroke-warning" : "stroke-destructive")}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-display text-lg font-bold", color)}>{score.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export function MetaVerificationCard({ result }: MetaVerificationCardProps) {
  const { domain_verification: dv, business_verification: bv } = result;
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="space-y-4">
      {/* Two cards side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Domain Verification */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-accent" />
              Verificação de Domínio
            </CardTitle>
            <Badge variant="outline" className={cn("text-[10px] w-fit",
              dv.status === "Pronto" ? "text-primary" : dv.status === "Parcialmente Pronto" ? "text-warning" : "text-destructive"
            )}>
              {dv.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreGauge score={dv.score} label="Domínio" />
            <div className="space-y-2">
              {dv.checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-secondary/30 p-2.5">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.requisito}</p>
                    {item.status !== "ok" && item.como_corrigir && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.como_corrigir}</p>
                    )}
                    {item.critico && item.status !== "ok" && (
                      <Badge variant="destructive" className="text-[9px] mt-1">Crítico</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Método recomendado:</span> {dv.metodo_recomendado}
              <p className="text-[11px] mt-0.5">{dv.justificativa_metodo}</p>
            </div>
          </CardContent>
        </Card>

        {/* Business Verification */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-accent" />
              Verificação de Negócio
            </CardTitle>
            <Badge variant="outline" className={cn("text-[10px] w-fit",
              bv.status === "Pronto para Verificar" ? "text-primary" : bv.status === "Incompleto" ? "text-warning" : "text-destructive"
            )}>
              {bv.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <ScoreGauge score={bv.score} label="Negócio" />
              <div className="flex-1">
                <Badge variant={bv.prontidao_whatsapp_api ? "default" : "secondary"} className="text-[10px]">
                  WhatsApp API: {bv.prontidao_whatsapp_api ? "Pronto" : "Não pronto"}
                </Badge>
              </div>
            </div>

            {/* Legal Data Table */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Dados Legais no Site</p>
              {Object.entries(bv.dados_legais_encontrados).map(([key, val]) => {
                const labels: Record<string, string> = { razao_social: "Razão Social", cnpj: "CNPJ", endereco: "Endereço", telefone: "Telefone", email: "E-mail" };
                return (
                  <div key={key} className="flex items-center gap-2 rounded bg-secondary/30 p-2">
                    {val.encontrado ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="text-[11px] text-foreground font-medium flex-1">{labels[key]}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{val.valor || "—"}</span>
                  </div>
                );
              })}
            </div>

            {/* Alerts */}
            {bv.alertas_criticos.length > 0 && (
              <div className="space-y-1">
                {bv.alertas_criticos.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-destructive">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents Accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="docs">
          <AccordionTrigger className="text-xs">
            Documentos necessários no Brasil para verificação Meta
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1.5">
              {bv.documentos_necessarios_brasil.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                  {doc}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Tutorial */}
      <button
        onClick={() => setShowTutorial(!showTutorial)}
        className="flex items-center gap-2 text-xs font-medium text-accent hover:underline"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showTutorial && "rotate-180")} />
        Ver passo a passo completo da verificação
      </button>
      {showTutorial && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-4">
            <ol className="space-y-2">
              {dv.passos_verificacao_meta.map((step, i) => (
                <li key={i} className="text-xs text-foreground">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
