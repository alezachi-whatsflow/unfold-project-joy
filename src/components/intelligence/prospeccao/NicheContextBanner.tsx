import { Lightbulb, Target, TrendingUp, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NicheContext } from "@/lib/nicheContext";

interface Props {
  context: NicheContext;
}

export function NicheContextBanner({ context }: Props) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Contexto de Nicho: {context.niche}</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <Target className="h-3.5 w-3.5" /> Dores Comuns
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {context.dores.map((d, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-destructive/60 mt-0.5">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Abordagem Sugerida
              </div>
              <p className="text-xs text-muted-foreground">{context.abordagem}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Resultado esperado:</strong> {context.resultadoEsperado}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-accent-foreground mb-0.5">
                <HelpCircle className="h-3.5 w-3.5" /> Pergunta-Chave
              </div>
              <p className="text-xs italic text-muted-foreground">"{context.perguntaChave}"</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
