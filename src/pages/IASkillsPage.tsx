import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Bot, Brain, Receipt, Loader2, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantId } from "@/hooks/useTenantId";

const SKILL_META: Record<string, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  auditor: { label: "Auditor de Qualidade", icon: <Eye className="h-5 w-5" />, color: "text-teal-400", description: "Avalia atendimentos automaticamente" },
  copilot: { label: "Copiloto do Consultor", icon: <Users className="h-5 w-5" />, color: "text-purple-400", description: "Sugere respostas em tempo real" },
  closer: { label: "Closer Autonomo", icon: <Bot className="h-5 w-5" />, color: "text-amber-400", description: "Automatiza atendimento 24/7" },
  expense_extractor: { label: "Extrator de Despesas", icon: <Receipt className="h-5 w-5" />, color: "text-emerald-500", description: "Reconhece recibos via Vision AI" },
};

export default function IASkillsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const tenantId = useTenantId();

  const { data: license, isLoading } = useQuery({
    queryKey: ["license-ai", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("licenses")
        .select("id, has_ai_module, ai_active_skills")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAiModule = !!license?.has_ai_module;
  const activeSkills: Record<string, boolean> = license?.ai_active_skills ?? {};

  // ── Empty State: module not active ──
  if (!hasAiModule) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Modulo de I.A. nao habilitado</h2>
            <p className="text-sm text-muted-foreground">
              Ative o Modulo de Inteligencia Artificial na Central de Assinatura para desbloquear
              Auditor, Copiloto, Closer e Extrator de Despesas.
            </p>
            <Button
              onClick={() => navigate(`/app/${slug}/assinatura`)}
              className="gap-2"
            >
              Gerenciar Add-ons <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Active State: config-only view ──
  const activeCount = Object.values(activeSkills).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" /> Modulo de IA
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeCount} skill{activeCount !== 1 ? "s" : ""} ativa{activeCount !== 1 ? "s" : ""}
          {" — "}
          <button
            onClick={() => navigate(`/app/${slug}/assinatura`)}
            className="text-primary hover:underline"
          >
            Gerenciar add-ons
          </button>
        </p>
      </div>

      {/* Active Skills Overview */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(SKILL_META).map(([key, meta]) => {
          const isActive = !!activeSkills[key];
          return (
            <Card
              key={key}
              className={`transition-all ${isActive ? "border-primary/40" : "border-border opacity-50"}`}
            >
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`${meta.color}`}>{meta.icon}</div>
                  <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                    {isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                {isActive && key === "auditor" && (
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate(`/app/${slug}/intelligence`)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Abrir Dashboard
                  </Button>
                )}
                {!isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => navigate(`/app/${slug}/assinatura`)}
                  >
                    Ativar na Central de Assinatura
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration hint */}
      {activeCount > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Configuracao das skills</p>
              <p className="text-xs text-muted-foreground">
                As skills ativas processam dados automaticamente. Use a aba "Auditor de Qualidade" para ver avaliacoes,
                ou configure o comportamento dos agentes na secao de Integracao.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
