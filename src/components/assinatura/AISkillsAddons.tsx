import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Users, Bot, Brain, Receipt, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTenantId } from "@/hooks/useTenantId";

interface SkillDef {
  key: string;
  label: string;
  tagline: string;
  description: string;
  price: number;
  stage: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  limit: string;
}

const SKILLS: SkillDef[] = [
  {
    key: "auditor",
    label: "Auditor de Qualidade",
    tagline: "Enxerga o que acontece na sua operacao",
    description: "Avalia cada atendimento automaticamente, identifica erros, oportunidades perdidas e recomenda melhorias.",
    price: 99,
    stage: "Estagio 1 — Visibilidade e diagnostico",
    icon: <Eye className="h-6 w-6" />,
    color: "text-teal-400",
    features: [
      "Score de qualidade por conversa (0-10)",
      "Identificacao de erros por categoria",
      "Ranking semanal de atendentes",
      "Recomendacao de treinamento",
      "Relatorio diario via WhatsApp",
    ],
    limit: "Nao responde ao cliente. Nao substitui atendente.",
  },
  {
    key: "copilot",
    label: "Copiloto do Consultor",
    tagline: "Ajuda seu time a performar melhor em tempo real",
    description: "Sugere respostas, proximos passos e contorno de objecoes para o atendente em tempo real.",
    price: 149,
    stage: "Estagio 2 — Performance do time",
    icon: <Users className="h-6 w-6" />,
    color: "text-purple-400",
    features: [
      "Sugestoes de resposta em tempo real",
      "Consulta a base de conhecimento",
      "Contorno de objecoes com modelos prontos",
      "Classificacao: intencao, momento do funil, risco",
      "Resumo automatico + sugestao de anotacao no CRM",
    ],
    limit: "Nao automatiza. Visivel apenas para o atendente.",
  },
  {
    key: "closer",
    label: "Closer Autonomo",
    tagline: "Executa automaticamente quando viavel",
    description: "Automatiza atendimento, qualificacao e conducao comercial com autonomia controlada.",
    price: 199,
    stage: "Estagio 3 — Automacao e escala",
    icon: <Bot className="h-6 w-6" />,
    color: "text-amber-400",
    features: [
      "Atendimento 24/7 com primeiro contato automatico",
      "Qualificacao e scoring automatico de leads",
      "Conducao do lead ate agendamento ou proposta",
      "Escalonamento inteligente para humano",
      "Aprendizado continuo por pontos de abandono",
    ],
    limit: "Age diretamente no WhatsApp. Requer configuracao cuidadosa.",
  },
  {
    key: "expense_extractor",
    label: "Assistente Autonomo",
    tagline: "Agente universal: despesas, agenda, resumos e comunicacao",
    description: "Agente de IA multimodal que le imagens/documentos, ouve audios, agenda atividades, processa resumos financeiros e programa comunicacoes.",
    price: 79,
    stage: "Estagio 4 — Automacao universal",
    icon: <Receipt className="h-6 w-6" />,
    color: "text-emerald-500",
    features: [
      "Extracao de despesas via Vision AI (fotos de recibos/NFs)",
      "Agendamento de reunioes e tarefas no CRM",
      "Resumo de audios e textos longos com action items",
      "Relatorio financeiro por periodo/contexto",
      "Agendamento de mensagens WhatsApp/Email/SMS",
    ],
    limit: "Requer conexao WhatsApp ativa e modulo I.A. habilitado.",
  },
];

interface AISkillsAddonsProps {
  hasAiModule: boolean;
}

export function AISkillsAddons({ hasAiModule }: AISkillsAddonsProps) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const [confirmDialog, setConfirmDialog] = useState<{ skill: string; action: "activate" | "deactivate" } | null>(null);

  const { data: license } = useQuery({
    queryKey: ["license-ai-skills", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("licenses")
        .select("id, ai_active_skills")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && hasAiModule,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ skillKey, active }: { skillKey: string; active: boolean }) => {
      if (!tenantId) throw new Error("Tenant nao identificado");
      const currentSkills = license?.ai_active_skills ?? {};
      const updatedSkills = { ...currentSkills, [skillKey]: active };

      const { error } = await supabase
        .from("licenses")
        .update({ ai_active_skills: updatedSkills })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: (_, { skillKey, active }) => {
      queryClient.invalidateQueries({ queryKey: ["license-ai-skills"] });
      queryClient.invalidateQueries({ queryKey: ["license-ai"] });
      const label = SKILLS.find(s => s.key === skillKey)?.label;
      toast.success(`${label} ${active ? "ativado" : "desativado"} com sucesso!`);
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar skill: " + (err.message || ""));
    },
  });

  const handleToggle = (skillKey: string, currentValue: boolean) => {
    setConfirmDialog({ skill: skillKey, action: currentValue ? "deactivate" : "activate" });
  };

  const confirmToggle = () => {
    if (!confirmDialog) return;
    toggleMutation.mutate({ skillKey: confirmDialog.skill, active: confirmDialog.action === "activate" });
    setConfirmDialog(null);
  };

  const activeSkills: Record<string, boolean> = license?.ai_active_skills ?? {};
  const totalAddOn = SKILLS.reduce((sum, s) => sum + (activeSkills[s.key] ? s.price : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Add-ons de Inteligencia Artificial
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {hasAiModule
              ? "Ative e gerencie as skills de IA do seu plano"
              : "Ative o Modulo de I.A. acima para desbloquear estas skills"}
          </p>
        </div>
        {totalAddOn > 0 && (
          <Badge variant="outline" className="text-lg px-4 py-2 border-primary text-primary">
            + R$ {totalAddOn}/mes
          </Badge>
        )}
      </div>

      {/* Maturity Stages */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {["Visibilidade", "Performance", "Automacao", "Financeiro"].map((label, i) => (
              <div key={i} className="space-y-1">
                <Zap className={`h-5 w-5 mx-auto ${["text-teal-400", "text-purple-400", "text-amber-400", "text-emerald-500"][i]}`} />
                <p className="text-xs font-medium text-foreground">Estagio {i + 1}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {SKILLS.map((skill) => {
          const isActive = !!activeSkills[skill.key];
          const canToggle = hasAiModule;
          return (
            <Card
              key={skill.key}
              className={`relative transition-all duration-300 ${
                !canToggle ? "opacity-50" :
                isActive ? "border-primary/50 shadow-primary/10" : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={skill.color}>{skill.icon}</div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggle(skill.key, isActive)}
                    disabled={!canToggle || toggleMutation.isPending}
                  />
                </div>
                <CardTitle className="text-lg">{skill.label}</CardTitle>
                <CardDescription className="italic">{skill.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{skill.description}</p>
                <Badge variant="secondary" className="text-xs">{skill.stage}</Badge>
                <Separator />
                <ul className="space-y-1.5">
                  {skill.features.map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>{f}
                    </li>
                  ))}
                </ul>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">+ R$ {skill.price}/mes</span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 italic border-t border-dashed border-border pt-2">
                  {skill.limit}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "activate" ? "Ativar" : "Desativar"}{" "}
              {SKILLS.find(s => s.key === confirmDialog?.skill)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "activate"
                ? `Isso adicionara R$ ${SKILLS.find(s => s.key === confirmDialog?.skill)?.price}/mes ao seu plano.`
                : "A skill sera desativada e nao processara mais dados automaticamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {confirmDialog?.action === "activate" ? "Ativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
