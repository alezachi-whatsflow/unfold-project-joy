/**
 * CalendarManagement — Google Calendar connection + sync settings per user.
 * Uses Supabase Edge Functions for OAuth (no separate backend needed).
 */
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Calendar, Unlink, Loader2, CheckCircle2,
  RefreshCw, Video,
} from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"

interface GCalConfig {
  id: string
  google_email: string
  google_name: string | null
  google_picture: string | null
  is_active: boolean
  sync_to_google: boolean
  sync_from_google: boolean
  selected_calendar_id: string
  selected_calendar_name: string | null
  auto_add_meet: boolean
  last_sync_at: string | null
  timezone: string
}

export function CalendarManagement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Handle callback redirect params
  useEffect(() => {
    const gcalStatus = searchParams.get("gcal")
    const gcalMsg = searchParams.get("msg")
    if (gcalStatus && gcalMsg) {
      if (gcalStatus === "success") {
        toast.success(gcalMsg)
        queryClient.invalidateQueries({ queryKey: ["gcal-config"] })
      } else {
        toast.error(gcalMsg)
      }
      // Clean URL params
      searchParams.delete("gcal")
      searchParams.delete("msg")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  // Fetch user's Google Calendar config
  const { data: config, isLoading } = useQuery({
    queryKey: ["gcal-config", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await (supabase as any)
        .from("google_calendar_configs")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle()
      return data as GCalConfig | null
    },
    enabled: !!user?.id,
  })

  // Update config
  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<GCalConfig>) => {
      if (!config?.id) return
      const { error } = await (supabase as any)
        .from("google_calendar_configs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", config.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gcal-config"] })
      toast.success("Configuração salva")
    },
    onError: () => toast.error("Erro ao salvar"),
  })

  // Disconnect
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!config?.id) return
      const { error } = await (supabase as any)
        .from("google_calendar_configs")
        .update({ is_active: false, access_token: null, refresh_token: null })
        .eq("id", config.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gcal-config"] })
      toast.success("Google Calendar desconectado")
    },
  })

  const handleConnect = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error("Sessão expirada. Faça login novamente.")
      return
    }
    // Redirect to edge function which handles Google OAuth
    const base = (supabase as any).supabaseUrl || "https://supabase.whatsflow.com.br"
    window.location.href = `${base}/functions/v1/google-calendar-auth?jwt=${session.access_token}`
  }

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = !!config?.is_active

  return (
    <Card className="rounded-xl" style={{ border: isConnected ? "1px solid rgba(16,185,129,0.2)" : undefined }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(66,133,244,0.1)" }}>
            <Calendar className="h-4 w-4" style={{ color: "#4285F4" }} />
          </div>
          Google Calendar
          {isConnected && (
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
              Conectado
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte seu Google Calendar para sincronizar atividades automaticamente.
              Cada membro da equipe pode conectar sua própria agenda.
            </p>
            <Button onClick={handleConnect} className="gap-2 text-xs rounded-lg">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Conectar com Google
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {config.google_picture ? (
                  <img src={config.google_picture} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">{config.google_name || config.google_email}</p>
                  <p className="text-[10px] text-muted-foreground">{config.google_email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive gap-1 rounded-lg"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unlink className="h-3 w-3" /> Desconectar
              </Button>
            </div>

            {/* Calendar info */}
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-muted-foreground">Agenda: </span>
              <span className="font-medium">{config.selected_calendar_name || "Agenda principal"}</span>
            </div>

            {/* Sync Toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <SyncToggle
                title="Whatsflow → Google"
                description="Atividades criadas no Whatsflow aparecem no Google Calendar"
                checked={config.sync_to_google}
                onChange={(v) => updateConfig.mutate({ sync_to_google: v })}
              />
              <SyncToggle
                title="Google → Whatsflow"
                description="Eventos do Google Calendar importados como atividades"
                checked={config.sync_from_google}
                onChange={(v) => updateConfig.mutate({ sync_from_google: v })}
              />
              <SyncToggle
                title="Google Meet automático"
                description="Criar link do Meet ao sincronizar reuniões"
                checked={config.auto_add_meet}
                onChange={(v) => updateConfig.mutate({ auto_add_meet: v })}
                icon={<Video className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </div>

            {/* Manual Sync + Last Sync Info */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                {config.last_sync_at && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Última sync: {new Date(config.last_sync_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <SyncButton />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const queryClient = useQueryClient()

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke("gcal-sync", {
        body: { action: "sync_all" },
      })
      if (error) throw error
      const count = data?.synced?.length || 0
      if (count > 0) {
        toast.success(`Sincronizado: ${count} item(ns)`)
      } else {
        toast.info("Tudo sincronizado — nenhuma alteração pendente")
      }
      queryClient.invalidateQueries({ queryKey: ["gcal-config"] })
    } catch (err: any) {
      toast.error("Erro na sincronização: " + (err.message || ""))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-lg" onClick={handleSync} disabled={syncing}>
      {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      {syncing ? "Sincronizando..." : "Sincronizar agora"}
    </Button>
  )
}

function SyncToggle({ title, description, checked, onChange, icon }: {
  title: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
