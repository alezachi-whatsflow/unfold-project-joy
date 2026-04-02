import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, BellRing, BellOff, MessageSquare, Users, DollarSign, LifeBuoy,
  AlertTriangle, Settings, Check, X, Monitor,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { markAsRead, markAllAsRead } from '@/services/notificationService'
import { toast } from 'sonner'

/* ── category visual map ─────────────────────────────────── */
const CATEGORY_META: Record<string, { Icon: typeof Bell; color: string }> = {
  mensageria:  { Icon: MessageSquare,  color: '#22c55e' },
  crm:         { Icon: Users,          color: '#3b82f6' },
  financeiro:  { Icon: DollarSign,     color: '#10b981' },
  tickets:     { Icon: LifeBuoy,       color: '#a855f7' },
  sla:         { Icon: AlertTriangle,  color: '#f59e0b' },
  sistema:     { Icon: Settings,       color: '#9ca3af' },
}

/* ── relative-time helper (pt-BR) ───────────────────────── */
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60)     return 'agora'
  const min = Math.floor(sec / 60)
  if (min < 60)     return `há ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24)     return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1)   return 'ontem'
  if (days < 30)    return `há ${days} dias`
  return fmtDate(date)
}

interface Notification {
  id: string
  category: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

/* ── audio helper ────────────────────────────────────────── */
let _audioCtx: AudioContext | null = null
function playNotificationSound() {
  try {
    if (!_audioCtx) _audioCtx = new AudioContext()
    const osc = _audioCtx.createOscillator()
    const gain = _audioCtx.createGain()
    osc.connect(gain)
    gain.connect(_audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, _audioCtx.currentTime)
    gain.gain.setValueAtTime(0.15, _audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.4)
    osc.start(_audioCtx.currentTime)
    osc.stop(_audioCtx.currentTime + 0.4)
  } catch {
    /* silently ignore */
  }
}

/* ════════════════════════════════════════════════════════════
   NotificationBell Component
   ════════════════════════════════════════════════════════════ */
export function NotificationBell() {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const prefsRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [desktopEnabled, setDesktopEnabled] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)

  // Sync desktop notification state with browser permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopEnabled(Notification.permission === 'granted')
    }
  }, [])

  /* ── fetch initial data ────────────────────────────────── */
  const fetchNotifications = useCallback(async (uid: string) => {
    const { data } = await (supabase as any)
      .from('notifications')
      .select('id, category, title, message, link, is_read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setNotifications(data)
  }, [])

  const fetchUnreadCount = useCallback(async (uid: string) => {
    const { count } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false)

    setUnreadCount(count ?? 0)
  }, [])

  const fetchSoundPref = useCallback(async (uid: string) => {
    const { data } = await (supabase as any)
      .from('notification_preferences')
      .select('sound_enabled')
      .eq('user_id', uid)
      .maybeSingle()

    if (data) setSoundEnabled(data.sound_enabled)
  }, [])

  /* ── init + realtime ───────────────────────────────────── */
  useEffect(() => {
    let channel: any = null

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      fetchNotifications(user.id)
      fetchUnreadCount(user.id)
      fetchSoundPref(user.id)

      // Subscribe to realtime inserts for this user
      channel = supabase
        .channel('notifications-bell')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const n = payload?.new as Notification | undefined
            if (!n?.id || !n?.title) return // Guard: skip invalid payloads
            setNotifications((prev) => [n, ...prev].slice(0, 20))
            setUnreadCount((c) => c + 1)
            if (soundEnabled) playNotificationSound()
            // Desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new window.Notification(n.title, {
                  body: n.message || '',
                  icon: '/pwa-192x192.png',
                  tag: n.id,
                })
              } catch { /* ignore */ }
            }
          },
        )
        .subscribe()
    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── close on outside click ────────────────────────────── */
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        (!prefsRef.current || !prefsRef.current.contains(e.target as Node))
      ) {
        setOpen(false)
        setShowPrefs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  /* ── handlers ──────────────────────────────────────────── */
  async function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      await markAsRead(n.id)
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (n.link) {
      navigate(n.link)
      setOpen(false)
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })))
    setUnreadCount(0)
  }

  /* ── render ────────────────────────────────────────────── */
  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => { setOpen((v) => !v); setShowPrefs(false) }}
        title="Notificações"
        className="flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 32, height: 32,
          background: 'var(--accent-primary-bg, hsl(var(--primary) / 0.12))',
          border: '1px solid var(--border-card, hsl(var(--border)))',
          color: 'var(--accent-primary, hsl(var(--primary)))',
          position: 'relative',
        }}
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16,
              borderRadius: 9999,
              background: '#ef4444', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360,
            maxHeight: 480,
            overflowY: 'auto',
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid hsl(var(--border))',
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Notificações</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    fontSize: 12, color: 'hsl(var(--primary))',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Check size={12} /> Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => {
                const meta = CATEGORY_META[n.category] ?? CATEGORY_META.sistema
                const CatIcon = meta.Icon

                return (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 16px',
                      width: '100%',
                      background: n.is_read ? 'transparent' : 'hsl(var(--primary) / 0.05)',
                      border: 'none',
                      borderBottom: '1px solid hsl(var(--border) / 0.5)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget.style.background = 'hsl(var(--accent))') }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.is_read ? 'transparent' : 'hsl(var(--primary) / 0.05)'
                    }}
                  >
                    {/* Category icon */}
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: meta.color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 2,
                      }}
                    >
                      <CatIcon size={15} style={{ color: meta.color }} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 13, fontWeight: n.is_read ? 400 : 600,
                          color: 'hsl(var(--foreground))',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#3b82f6', flexShrink: 0,
                          }} />
                        )}
                      </div>
                      {n.message && (
                        <div style={{
                          fontSize: 12, color: 'hsl(var(--muted-foreground))',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}>
                          {n.message}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3, opacity: 0.7 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid hsl(var(--border))',
              textAlign: 'center', flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowPrefs(true)}
              style={{
                fontSize: 12, color: 'hsl(var(--primary))',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <Settings size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Configurar notificações
            </button>
          </div>
        </div>
      )}

      {/* Preferences floating panel — inside dropdownRef scope for click-outside */}
      {open && showPrefs && (
        <div ref={prefsRef} style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 10000 }}>
          <NotificationPrefsInline userId={userId} onClose={() => setShowPrefs(false)} />
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Inline Preferences Panel (shown inside dropdown context)
   ════════════════════════════════════════════════════════════ */
interface PrefsInlineProps {
  userId: string | null
  onClose: () => void
}

const PREF_CATEGORIES = [
  { key: 'mensageria',  label: 'Mensageria',     desc: 'Nova mensagem, conversa na fila' },
  { key: 'crm',         label: 'CRM / Pipeline',  desc: 'Lead criado, mudança de etapa' },
  { key: 'financeiro',  label: 'Financeiro',       desc: 'Pagamento recebido, cobrança vencida' },
  { key: 'tickets',     label: 'Tickets',          desc: 'Ticket aberto, atualização' },
  { key: 'sla',         label: 'SLA',              desc: 'SLA prestes a vencer, vencido' },
  { key: 'sistema',     label: 'Sistema',          desc: 'Backup, manutenção, updates' },
] as const

function NotificationPrefsInline({ userId, onClose }: PrefsInlineProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    mensageria: true, crm: true, financeiro: true,
    tickets: true, sla: true, sistema: false, sound_enabled: true,
  })
  const [loaded, setLoaded] = useState(false)
  const rowExistsRef = useRef(false)

  // Browser notification permission state
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  )

  const handleDesktopToggle = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador nao suporta notificacoes desktop')
      return
    }

    if (Notification.permission === 'denied') {
      toast.error('Notificacoes bloqueadas. Clique no icone de cadeado na barra de endereco e permita notificacoes para este site.')
      return
    }

    if (Notification.permission === 'granted') {
      toast.info('Para desativar, use as configuracoes do navegador (icone de cadeado)')
      return
    }

    // Request permission
    const result = await Notification.requestPermission()
    setBrowserPermission(result)

    if (result === 'granted') {
      toast.success('Notificacoes do sistema ativadas')
      // Save preference to DB
      if (userId) {
        await (supabase as any)
          .from('profiles')
          .update({ push_notifications_enabled: true })
          .eq('id', userId)
      }
      // Show test notification
      try {
        new window.Notification('Whatsflow', {
          body: 'Notificacoes ativadas com sucesso!',
          icon: '/pwa-192x192.png',
        })
      } catch { /* ignore */ }
    } else if (result === 'denied') {
      toast.error('Notificacoes foram bloqueadas. Para reativar, clique no icone de cadeado na barra de endereco.')
    }
  }

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) console.error('[NotifPrefs] load error:', error)

      if (data) {
        rowExistsRef.current = true
        setPrefs({
          mensageria: data.mensageria ?? true,
          crm: data.crm ?? true,
          financeiro: data.financeiro ?? true,
          tickets: data.tickets ?? true,
          sla: data.sla ?? true,
          sistema: data.sistema ?? false,
          sound_enabled: data.sound_enabled ?? true,
        })
      }
      setLoaded(true)
    })()
  }, [userId])

  async function toggle(key: string) {
    if (!userId) return
    let tenantId: string | null = null
    try {
      const { getTenantId } = await import('@/lib/tenantResolver')
      tenantId = await getTenantId()
    } catch { /* ignore */ }
    if (!tenantId) return

    // Compute new prefs from latest state via functional updater
    let updatedPrefs: Record<string, boolean> = {}
    setPrefs((prev) => {
      updatedPrefs = { ...prev, [key]: !prev[key] }
      return updatedPrefs
    })

    const payload = {
      mensageria: updatedPrefs.mensageria,
      crm: updatedPrefs.crm,
      financeiro: updatedPrefs.financeiro,
      tickets: updatedPrefs.tickets,
      sla: updatedPrefs.sla,
      sistema: updatedPrefs.sistema,
      sound_enabled: updatedPrefs.sound_enabled,
      updated_at: new Date().toISOString(),
    }

    if (rowExistsRef.current) {
      // UPDATE existing row
      const { error } = await (supabase as any)
        .from('notification_preferences')
        .update(payload)
        .eq('user_id', userId)
      if (error) console.error('[NotifPrefs] update error:', error)
    } else {
      // INSERT new row
      const { error } = await (supabase as any)
        .from('notification_preferences')
        .insert({ user_id: userId, tenant_id: tenantId, ...payload })
      if (error) console.error('[NotifPrefs] insert error:', error)
      else rowExistsRef.current = true
    }
  }

  if (!loaded) return null

  return (
    <div
      style={{
        width: 360,
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Preferencias de Notificacao</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
        >
          <X size={14} />
        </button>
      </div>

      {PREF_CATEGORIES.map((cat) => (
        <div key={cat.key} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid hsl(var(--border) / 0.4)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>{cat.label}</div>
            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{cat.desc}</div>
          </div>
          <ToggleSwitch checked={prefs[cat.key]} onChange={() => toggle(cat.key)} />
        </div>
      ))}

      {/* Desktop notifications toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0 8px',
        marginTop: 4,
        borderTop: '1px solid hsl(var(--border) / 0.4)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Monitor size={13} /> Notificacoes do computador
          </div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            {browserPermission === 'denied'
              ? 'Bloqueado pelo navegador'
              : browserPermission === 'granted'
              ? 'Ativado'
              : 'Mostrar alertas na area de trabalho'}
          </div>
        </div>
        <ToggleSwitch
          checked={browserPermission === 'granted'}
          onChange={handleDesktopToggle}
          disabled={browserPermission === 'denied'}
        />
      </div>

      {browserPermission === 'denied' && (
        <div style={{ fontSize: 10, color: 'hsl(var(--destructive))', padding: '0 0 8px', lineHeight: 1.4 }}>
          Notificacoes bloqueadas no navegador. Clique no icone de cadeado na barra de endereco e permita notificacoes.
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0 0',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>Som de notificacao</div>
        </div>
        <ToggleSwitch checked={prefs.sound_enabled} onChange={() => toggle('sound_enabled')} />
      </div>
    </div>
  )
}

/* ── simple toggle switch ────────────────────────────────── */
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: disabled ? 'hsl(var(--muted))' : checked ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}
