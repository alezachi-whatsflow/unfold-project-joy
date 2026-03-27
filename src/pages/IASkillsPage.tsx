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
import { Eye, Users, Zap, Bot, Settings, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
    tagline: "Enxerga o que acontece na sua operação",
    description: "Avalia cada atendimento automaticamente, identifica erros, oportunidades perdidas e recomenda melhorias.",
    price: 99,
    stage: "Estágio 1 — Visibilidade e diagnóstico",
    icon: <Eye className="h-6 w-6" />,
    color: "text-teal-400",
    features: [
      "Score de qualidade por conversa (0-10)",
      "Identificação de erros por categoria",
      "Ranking semanal de atendentes",
      "Recomendação de treinamento",
      "Relatório diário via WhatsApp",
    ],
    limit: "Não responde ao cliente. Não substitui atendente.",
  },
  {
    key: "copilot",
    label: "Copiloto do Consultor",
    tagline: "Ajuda seu time a performar melhor em tempo real",
    description: "Sugere respostas, próximos passos e contorno de objeções para o atendente em tempo real.",
    price: 149,
    stage: "Estágio 2 — Performance do time",
    icon: <Users className="h-6 w-6" />,
    color: "text-purple-400",
    features: [
      "Sugestões de resposta em tempo real",
      "Consulta à base de conhecimento",
      "Contorno de objeções com modelos prontos",
      "Classificação: intenção, momento do funil, risco",
      "Resumo automático + sugestão de anotação no CRM",
    ],
    limit: "Não automatiza. Visível apenas para o atendente.",
  },
  {
    key: "closer",
    label: "Closer Autônomo",
    tagline: "Executa automaticamente quando viável",
    description: "Automatiza atendimento, qualificação e condução comercial com autonomia controlada.",
    price: 199,
    stage: "Estágio 3 — Automação e escala",
    icon: <Bot className="h-6 w-6" />,
    color: "text-amber-400",
    features: [
      "Atendimento 24/7 com primeiro contato automático",
      "Qualificação e scoring automático de leads",
      "Condução do lead até agendamento ou proposta",
      "Escalonamento inteligente para humano",
      "Aprendizado contínuo por pontos de abandono",
    ],
    limit: "Age diretamente no WhatsApp. Requer configuração cuidadosa.",
  },
];

export default function IASkillsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDialog, setConfirmDialog] = useState<{ skill: string; action: "activate" | "deactivate" } | null>(null);

  // Get tenant from localStorage
  const tenantId = localStorage.getItem("whatsflow_default_tenant_id");

  // Fetch license
  const { data: license, isLoading } = useQuery({
    queryKey: ["license-ai", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("licenses")
        .select("id, ai_active_skills, ai_config, plan, monthly_value")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ skillKey, active }: { skillKey: string; active: boolean }) => {
      if (!license?.id) throw new Error("Licença não encontrada");
      const currentSkills = license.ai_active_skills ?? { auditor: false, copilot: false, closer: false };
      const updatedSkills = { ...currentSkills, [skillKey]: active };
      const { error } = await supabase
        .from("licenses")
        .update({ ai_active_skills: updatedSkills })
        .eq("id", license.id);
      if (error) throw error;
    },
    onSuccess: (_, { skillKey, active }) => {
      queryClient.invalidateQueries({ queryKey: ["license-ai"] });
      const label = SKILLS.find(s => s.key === skillKey)?.label;
      toast.success(`${label} ${active ? "ativado" : "desativado"} com sucesso!`);
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar skill: " + (err.message || ""));
    },
  });

  const handleToggle = (skillKey: string, currentValue: boolean) => {
    if (currentValue) {
      // Deactivating requires confirmation
      setConfirmDialog({ skill: skillKey, action: "deactivate" });
    } else {
      setConfirmDialog({ skill: skillKey, action: "activate" });
    }
  };

  const confirmToggle = () => {
    if (!confirmDialog) return;
    const active = confirmDialog.action === "activate";
    toggleMutation.mutate({ skillKey: confirmDialog.skill, active });
    setConfirmDialog(null);
  };

  const activeSkills = license?.ai_active_skills ?? { auditor: false, copilot: false, closer: false };
  const totalAddOn = SKILLS.reduce((sum, s) => sum + (activeSkills[s.key] ? s.price : 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" /> Módulo de IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Ative e configure as skills de inteligência artificial para seu atendimento
          </p>
        </div>
        {totalAddOn > 0 && (
          <Badge variant="outline" className="text-lg px-4 py-2 border-primary text-primary">
            + R$ {totalAddOn}/mês
          </Badge>
        )}
      </div>

      {/* Maturity Stages Banner */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <Zap className="h-5 w-5 mx-auto text-teal-400" />
              <p className="text-xs font-medium text-foreground">Estágio 1</p>
              <p className="text-[10px] text-muted-foreground">Sem visibilidade → Auditor</p>
            </div>
            <div className="space-y-1">
              <Zap className="h-5 w-5 mx-auto text-purple-400" />
              <p className="text-xs font-medium text-foreground">Estágio 2</p>
              <p className="text-[10px] text-muted-foreground">Time inconsistente → Copiloto</p>
            </div>
            <div className="space-y-1">
              <Zap className="h-5 w-5 mx-auto text-amber-400" />
              <p className="text-xs font-medium text-foreground">Estágio 3</p>
              <p className="text-[10px] text-muted-foreground">Alto volume → Closer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {SKILLS.map((skill) => {
          const isActive = !!activeSkills[skill.key];
          return (
            <Card
              key={skill.key}
              className={`relative transition-all duration-300 ${
                isActive
                  ? "border-primary/50 shadow-primary/10"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`${skill.color}`}>{skill.icon}</div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggle(skill.key, isActive)}
                    disabled={toggleMutation.isPending}
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
                      <span className="text-primary mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">+ R$ {skill.price}/mês</span>
                  {isActive && skill.key === "auditor" && (
                    <Button size="sm" variant="outline" onClick={() => navigate("/ia/auditor")}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Dashboard
                    </Button>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/80 italic border-t border-dashed border-border pt-2">
                  ⚠ {skill.limit}
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
                ? `Isso adicionará R$ ${SKILLS.find(s => s.key === confirmDialog?.skill)?.price}/mês ao seu plano.`
                : "A skill será desativada e não processará mais dados automaticamente."}
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
