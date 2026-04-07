/**
 * CalendarManagement — Google Calendar connection + sync settings per user.
 * Displayed in Profile/Settings page.
 */
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar, Link2, Unlink, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ""

interface GCalConfig {
  id: string
  google_email: string
  google_name: string | null
  is_active: boolean
  sync_to_google: boolean
  sync_from_google: boolean
  selected_calendar_id: string
  selected_calendar_name: string | null
  auto_add_meet: boolean
  last_sync_at: string | null
  timezone: string
}

interface GoogleCalendarItem {
  id: string
  summary: string
  primary?: boolean
}

export function CalendarManagement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)

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

  // Fetch available calendars when connected
  useEffect(() => {
    if (config?.is_active && BACKEND_URL) {
      fetchCalendars()
    }
  }, [config?.is_active])

  const fetchCalendars = async () => {
    if (!BACKEND_URL) return
    setLoadingCalendars(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND_URL}/auth/google/calendars`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars || [])
      }
    } catch {}
    setLoadingCalendars(false)
  }

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
      toast.success("Configuracao salva")
    },
    onError: () => toast.error("Erro ao salvar"),
  })

  // Disconnect
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!BACKEND_URL) return
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${BACKEND_URL}/auth/google/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gcal-config"] })
      toast.success("Google Calendar desconectado")
    },
  })

  const handleConnect = async () => {
    if (!BACKEND_URL) {
      toast.error("Backend nao configurado (VITE_BACKEND_URL)")
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error("Sessao expirada. Faca login novamente.")
      return
    }
    window.location.href = `${BACKEND_URL}/auth/google?jwt=${session.access_token}`
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = !!config?.is_active

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          /* ── Disconnected State ── */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte seu Google Calendar para sincronizar atividades automaticamente.
              Cada membro da equipe pode conectar sua propria agenda.
            </p>
            <Button onClick={handleConnect} className="gap-2 text-xs" disabled={!BACKEND_URL}>
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Conectar com Google
            </Button>
            {!BACKEND_URL && (
              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Backend nao configurado
              </p>
            )}
          </div>
        ) : (
          /* ── Connected State ── */
          <div className="space-y-4">
            {/* Connection Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium text-foreground">{config.google_name || config.google_email}</p>
                  <p className="text-[10px] text-muted-foreground">{config.google_email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive gap-1"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unlink className="h-3 w-3" /> Desconectar
              </Button>
            </div>

            {/* Calendar Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs">Agenda para sincronizar</Label>
              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando agendas...
                </div>
              ) : calendars.length > 0 ? (
                <Select
                  value={config.selected_calendar_id || "primary"}
                  onValueChange={(v) => {
                    const cal = calendars.find(c => c.id === v)
                    updateConfig.mutate({
                      selected_calendar_id: v,
                      selected_calendar_name: cal?.summary || null,
                    })
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {calendars.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.summary} {c.primary && "(Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Usando agenda principal ({config.selected_calendar_name || "primary"})
                </p>
              )}
            </div>

            {/* Sync Toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Whatsflow → Google</p>
                  <p className="text-[10px] text-muted-foreground">Sincronizar atividades criadas no Whatsflow para o Google Calendar</p>
                </div>
                <Switch
                  checked={config.sync_to_google}
                  onCheckedChange={(v) => updateConfig.mutate({ sync_to_google: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Google → Whatsflow</p>
                  <p className="text-[10px] text-muted-foreground">Importar eventos do Google Calendar como atividades</p>
                </div>
                <Switch
                  checked={config.sync_from_google}
                  onCheckedChange={(v) => updateConfig.mutate({ sync_from_google: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Google Meet automatico</p>
                  <p className="text-[10px] text-muted-foreground">Criar link do Google Meet ao sincronizar reunioes</p>
                </div>
                <Switch
                  checked={config.auto_add_meet}
                  onCheckedChange={(v) => updateConfig.mutate({ auto_add_meet: v })}
                />
              </div>
            </div>

            {/* Last Sync Info */}
            {config.last_sync_at && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                <RefreshCw className="h-3 w-3" />
                Ultima sincronizacao: {new Date(config.last_sync_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
