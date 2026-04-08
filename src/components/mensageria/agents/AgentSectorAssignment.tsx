/**
 * AgentSectorAssignment — Assign agents to departments/sectors.
 * Used in AgentDashboard to control which agents see which conversations.
 */
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTenantId } from "@/hooks/useTenantId"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Shield, Users } from "lucide-react"
import { toast } from "sonner"

interface Agent {
  id: string
  full_name: string | null
  email: string
  role: string
  view_all_chats: boolean
}

interface Department {
  id: string
  name: string
  color: string
}

export default function AgentSectorAssignment() {
  const tenantId = useTenantId()
  const queryClient = useQueryClient()

  // Fetch agents (profiles in this tenant)
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["sector-agents", tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data: uts } = await supabase
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", tenantId)
      const userIds = (uts || []).map((u: any) => u.user_id)
      if (!userIds.length) return []

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, view_all_chats")
        .in("id", userIds)

      // Get emails from auth
      const agents: Agent[] = []
      for (const p of data || []) {
        agents.push({
          id: p.id,
          full_name: p.full_name,
          email: "",
          role: p.role || "consultor",
          view_all_chats: (p as any).view_all_chats || false,
        })
      }
      return agents
    },
    enabled: !!tenantId,
  })

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await supabase
        .from("departments")
        .select("id, name, color")
        .eq("tenant_id", tenantId)
        .order("name")
      return (data || []) as Department[]
    },
    enabled: !!tenantId,
  })

  // Fetch all assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["agent-departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const { data } = await (supabase as any)
        .from("agent_departments")
        .select("user_id, department_id")
        .eq("tenant_id", tenantId)
      return (data || []) as { user_id: string; department_id: string }[]
    },
    enabled: !!tenantId,
  })

  // Toggle assignment
  const toggleAssignment = useMutation({
    mutationFn: async ({ userId, deptId, assigned }: { userId: string; deptId: string; assigned: boolean }) => {
      if (assigned) {
        await (supabase as any).from("agent_departments").insert({
          tenant_id: tenantId,
          user_id: userId,
          department_id: deptId,
        })
      } else {
        await (supabase as any)
          .from("agent_departments")
          .delete()
          .eq("user_id", userId)
          .eq("department_id", deptId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-departments"] })
      queryClient.invalidateQueries({ queryKey: ["sector-assignments"] })
    },
    onError: () => toast.error("Erro ao atualizar setor"),
  })

  // Toggle view_all_chats
  const toggleViewAll = useMutation({
    mutationFn: async ({ userId, value }: { userId: string; value: boolean }) => {
      await supabase
        .from("profiles")
        .update({ view_all_chats: value })
        .eq("id", userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sector-agents"] })
      queryClient.invalidateQueries({ queryKey: ["sector-profile"] })
      toast.success("Permissao atualizada")
    },
  })

  const isAssigned = (userId: string, deptId: string) =>
    assignments.some(a => a.user_id === userId && a.department_id === deptId)

  if (agentsLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Crie setores primeiro em "Setores" para configurar o controle de acesso.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Controle de Acesso por Setor
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Defina quais setores cada atendente pode visualizar. Sem setores atribuidos = acesso a tudo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map(agent => {
          const isSuperOrAdmin = ["superadmin", "admin"].includes(agent.role)
          const agentDepts = assignments.filter(a => a.user_id === agent.id).map(a => a.department_id)

          return (
            <div key={agent.id} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                    {(agent.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{agent.full_name || "Sem nome"}</p>
                    <p className="text-[10px] text-muted-foreground">{agent.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground">Ver tudo</Label>
                  <Switch
                    checked={isSuperOrAdmin || agent.view_all_chats}
                    disabled={isSuperOrAdmin}
                    onCheckedChange={(v) => toggleViewAll.mutate({ userId: agent.id, value: v })}
                  />
                </div>
              </div>

              {!isSuperOrAdmin && !agent.view_all_chats && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {departments.map(dept => {
                    const assigned = isAssigned(agent.id, dept.id)
                    return (
                      <button
                        key={dept.id}
                        onClick={() => toggleAssignment.mutate({ userId: agent.id, deptId: dept.id, assigned: !assigned })}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                          assigned
                            ? "border-primary bg-primary/15 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: dept.color }} />
                        {dept.name}
                      </button>
                    )
                  })}
                  {agentDepts.length === 0 && (
                    <span className="text-[10px] text-amber-500">Sem setores = acesso a todos</span>
                  )}
                </div>
              )}

              {(isSuperOrAdmin || agent.view_all_chats) && (
                <p className="text-[10px] text-emerald-500">Acesso total a todos os setores</p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
