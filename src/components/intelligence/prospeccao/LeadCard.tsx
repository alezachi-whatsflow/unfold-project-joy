import { useState } from "react";
import { Globe, Phone, ExternalLink, Loader2, Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ProspectLead } from "../ProspeccaoTab";

interface Props {
  lead: ProspectLead;
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

const PIPELINE_STAGES = ["Prospecção", "Qualificado", "Proposta Enviada", "Em Negociação"];

export function LeadCard({ lead }: Props) {
  const cat = getCategory(lead.score);
  const meta = scoreMeta[cat];
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("Prospecção");
  const [responsible, setResponsible] = useState("Eu (usuário logado)");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleConfirm = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setOpen(false);
      setEstimatedValue("");
      setStage("Prospecção");
      toast({ title: "Lead enviado ao CRM", description: `"${lead.name}" adicionado na etapa "${stage}".` });
    }, 1500);
  };

  const handleValueChange = (val: string) => {
    setEstimatedValue(val.replace(/[^0-9.,]/g, ""));
  };

  return (
    <Card className="relative">
      <div className="absolute top-3 right-3">
        <Badge className={meta.bg}>{lead.score}/10</Badge>
      </div>
      <CardContent className="pt-5 space-y-3">
        <div className="pr-16">
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
          <span className={lead.hasSite ? "text-primary" : "text-muted-foreground/40"}>
            <Globe className="h-4 w-4" />
          </span>
          <span className={lead.hasPhone ? "text-primary" : "text-muted-foreground/40"}>
            <Phone className="h-4 w-4" />
          </span>
        </div>

        <div className="pt-2 border-t border-border space-y-2">
          <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>

          {/* CRM Button with Popover */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="w-full gap-1 text-xs text-white"
                style={{ backgroundColor: "#00C896" }}
              >
                <Plus className="h-3 w-3" /> Enviar para CRM
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="center" side="top">
              <div className="space-y-3">
                <p className="font-semibold text-sm">Enviar para o Pipeline de Vendas</p>

                <div className="space-y-1.5">
                  <Label className="text-xs">Etapa do Pipeline</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Responsável</Label>
                  <Select value={responsible} onValueChange={setResponsible}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eu (usuário logado)" className="text-xs">Eu (usuário logado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valor estimado</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="R$ 0,00"
                    value={estimatedValue}
                    onChange={(e) => handleValueChange(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => setOpen(false)}
                    disabled={isSending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 text-white gap-1"
                    style={{ backgroundColor: "#00C896" }}
                    onClick={handleConfirm}
                    disabled={isSending}
                  >
                    {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {isSending ? "Enviando..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Visit Site Button */}
          {lead.url && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs"
              style={{ borderColor: "#00C896", color: "#00C896" }}
              asChild
            >
              <a href={lead.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" /> Visitar Site
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
