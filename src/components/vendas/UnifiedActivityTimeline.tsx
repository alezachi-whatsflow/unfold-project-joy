import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { logNote, type ActivityType } from '@/services/crmActivityService'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import {
  MessageSquare, Clock, FileText, Phone, Mail,
  ArrowRight, Tag, UserPlus, Star, Send, Calendar,
  Loader2, LifeBuoy,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ---------- types ----------

interface Activity {
  id: string
  tenant_id: string
  card_id: string | null
  contact_jid: string | null
  activity_type: string
  content: Record<string, any>
  performed_by: string | null
  performed_by_name: string | null
  created_at: string
}

interface Props {
  cardId?: string
  contactJid?: string
  limit?: number // default 50
}

// ---------- activity meta ----------

const ACTIVITY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  whatsapp_msg:       { icon: MessageSquare, color: '#25D366', label: 'Mensagem enviada' },
  whatsapp_received:  { icon: MessageSquare, color: '#25D366', label: 'Mensagem recebida' },
  whatsapp_scheduled: { icon: Clock,         color: '#F59E0B', label: 'Mensagem agendada' },
  note:               { icon: FileText,      color: '#3B82F6', label: 'Nota adicionada' },
  call:               { icon: Phone,         color: '#8B5CF6', label: 'Ligação registrada' },
  email:              { icon: Mail,          color: '#0EA5E9', label: 'E-mail enviado' },
  stage_change:       { icon: ArrowRight,    color: '#F97316', label: 'Mudou de etapa' },
  tag_added:          { icon: Tag,           color: '#7C3AED', label: 'Tag adicionada' },
  assigned:           { icon: UserPlus,      color: '#14B8A6', label: 'Atribuído para' },
  lead_created:       { icon: Star,          color: '#6366F1', label: 'Lead criado' },
  file_attached:      { icon: FileText,      color: '#3B82F6', label: 'Arquivo anexado' },
  meeting:            { icon: Calendar,      color: '#F59E0B', label: 'Reunião agendada' },
  ticket_opened:      { icon: LifeBuoy,      color: '#8B5CF6', label: 'Ticket aberto' },
}

const DEFAULT_META = { icon: FileText, color: '#6B7280', label: 'Atividade' }

// ---------- helpers ----------

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
  } catch {
    return dateStr
  }
}

function renderContent(activity: Activity): React.ReactNode {
  const c = activity.content ?? {}
  const type = activity.activity_type

  if (type === 'whatsapp_msg' || type === 'whatsapp_received') {
    return <span className="text-sm text-muted-foreground">{c.text || ''}</span>
  }
  if (type === 'whatsapp_scheduled') {
    return (
      <span className="text-sm text-muted-foreground">
        {c.text || ''}{c.scheduled_at ? ` — agendada para ${new Date(c.scheduled_at as string).toLocaleString('pt-BR')}` : ''}
      </span>
    )
  }
  if (type === 'note') {
    return <span className="text-sm text-muted-foreground whitespace-pre-wrap">{c.text || ''}</span>
  }
  if (type === 'call') {
    const dur = c.duration_seconds ? `${Math.floor(Number(c.duration_seconds) / 60)}min ${Number(c.duration_seconds) % 60}s` : ''
    return (
      <span className="text-sm text-muted-foreground">
        {dur}{c.notes ? ` — ${c.notes}` : ''}
      </span>
    )
  }
  if (type === 'stage_change') {
    return (
      <span className="text-sm text-muted-foreground">
        {c.old_stage || '?'} → {c.new_stage || '?'}
      </span>
    )
  }
  if (type === 'tag_added') {
    return <span className="text-sm text-muted-foreground">#{c.tag}</span>
  }
  if (type === 'assigned') {
    return <span className="text-sm text-muted-foreground">{c.assignee}</span>
  }
  if (type === 'file_attached') {
    return <span className="text-sm text-muted-foreground">{c.filename || 'arquivo'}</span>
  }
  if (type === 'ticket_opened') {
    return (
      <div>
        <p className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>
          {(activity.content as any)?.title}
        </p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
          Aberto
        </span>
      </div>
    )
  }

  // fallback: show raw JSON keys
  const txt = Object.values(c).filter(Boolean).join(' ')
  return txt ? <span className="text-sm text-muted-foreground">{txt}</span> : null
}

// ---------- component ----------

export default function UnifiedActivityTimeline({ cardId, contactJid, limit = 50 }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch activities
  useEffect(() => {
    if (!cardId && !contactJid) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)

    const fetchActivities = async () => {
      let query = supabase
        .from('crm_activities' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (cardId && contactJid) {
        query = query.or(`card_id.eq.${cardId},contact_jid.eq.${contactJid}`)
      } else if (cardId) {
        query = query.eq('card_id', cardId)
      } else if (contactJid) {
        query = query.eq('contact_jid', contactJid)
      }

      const { data, error } = await query
      if (error) {
        console.warn('[UnifiedTimeline] Fetch error:', error.message)
      }
      setActivities((data as unknown as Activity[]) ?? [])
      setLoading(false)
    }

    fetchActivities()
  }, [cardId, contactJid, limit])

  // Realtime subscription
  useEffect(() => {
    if (!cardId && !contactJid) return

    const filterKey = cardId ? `card_id=eq.${cardId}` : `contact_jid=eq.${contactJid}`

    const channel = supabase
      .channel(`crm-activities-${cardId || contactJid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crm_activities',
        filter: filterKey,
      }, (payload: any) => {
        setActivities(prev => [payload.new as Activity, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cardId, contactJid])

  // Add note handler
  const handleAddNote = async () => {
    if (!noteText.trim() || !cardId) return
    setSubmitting(true)
    try {
      const userName = localStorage.getItem('whatsflow_user_name') || 'Usuário'
      logNote(cardId, noteText.trim(), userName)
      setNoteText('')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- render ----------

  return (
    <div className="flex flex-col h-full">
      {/* Add note input */}
      {cardId && (
        <div className="flex gap-2 p-3 border-b">
          <Input
            placeholder="Adicionar nota..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddNote()
              }
            }}
            disabled={submitting}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddNote}
            disabled={!noteText.trim() || submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Timeline list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atividade registrada.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            {activities.map((activity) => {
              const meta = ACTIVITY_META[activity.activity_type] || DEFAULT_META
              const IconComp = meta.icon

              return (
                <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Icon circle */}
                  <div
                    className="relative z-10 flex-shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 bg-background"
                    style={{ borderColor: meta.color }}
                  >
                    <IconComp className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {meta.label}
                        {activity.performed_by_name && (
                          <span className="font-normal text-muted-foreground"> por {activity.performed_by_name}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {relativeTime(activity.created_at)}
                      </span>
                    </div>

                    <div className="mt-0.5">{renderContent(activity)}</div>

                    {/* Separator line */}
                    <div className="border-b mt-3" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
