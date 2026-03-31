// InlineTicketForm.tsx
// DB Logic — Double-Entry:
// 1. INSERT into nexus_tickets (title, description, priority, status, metadata JSONB)
//    metadata: { source: 'crm_card'|'inbox', reference_id: cardId|conversationJid }
// 2. INSERT into crm_activities (activity_type: 'ticket_opened', content: { ticket_id, title })
//    Links the ticket to the customer's unified timeline

import { useState } from 'react'
import { LifeBuoy, Send, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { logCrmActivity } from '@/services/crmActivityService'

interface Props {
  // Context: where the ticket is being opened from
  source: 'crm_card' | 'inbox'
  referenceId: string  // card_id or conversation JID
  cardId?: string      // for crm_activities link
  contactJid?: string  // for crm_activities link
  onCreated?: (ticketId: string) => void
}

type Priority = 'baixa' | 'normal' | 'alta'

export function InlineTicketForm({ source, referenceId, cardId, contactJid, onCreated }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Título é obrigatório'); return }
    setSaving(true)

    const tId = localStorage.getItem('whatsflow_default_tenant_id')
    const { data: { user } } = await supabase.auth.getUser()

    // DB Logic Step 1: INSERT into nexus_tickets
    // The metadata JSONB stores the context of where the ticket was opened
    const { data: ticket, error: ticketErr } = await (supabase as any)
      .from('nexus_tickets')
      .insert({
        title,
        description,
        priority,
        status: 'aberto',
        created_by: user?.id ?? null,
        metadata: {
          source,
          reference_id: referenceId,
          tenant_id: tId,
        },
      })
      .select('id, title')
      .single()

    if (ticketErr) {
      setSaving(false)
      toast.error('Erro ao criar ticket')
      return
    }

    // DB Logic Step 2: INSERT into crm_activities (unified timeline)
    // This creates the "ticket_opened" entry in the customer's history
    logCrmActivity({
      cardId: cardId ?? null,
      contactJid: contactJid ?? null,
      activityType: 'ticket_opened' as any,
      content: {
        ticket_id: ticket.id,
        title: ticket.title,
        priority,
        source,
      },
      performedByName: user?.user_metadata?.full_name ?? user?.email ?? 'Sistema',
    })

    setSaving(false)
    toast.success('Ticket criado com sucesso')
    setTitle(''); setDescription(''); setPriority('normal')
    setIsExpanded(false)
    onCreated?.(ticket.id)
  }

  // Collapsed: just a button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <LifeBuoy size={14} />
        Abrir Ticket
      </button>
    )
  }

  // Expanded: inline form
  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: 'hsl(var(--muted)/0.2)', border: '1px solid hsl(var(--border)/0.5)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LifeBuoy size={14} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Novo Ticket de Suporte</span>
        </div>
        <button onClick={() => setIsExpanded(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
          <X size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título do ticket..."
        className="w-full h-8 rounded-md border px-3 text-sm bg-transparent"
        style={{ borderColor: 'hsl(var(--border))' }}
        autoFocus
      />

      {/* Priority */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Prioridade:</span>
        {(['baixa', 'normal', 'alta'] as Priority[]).map(p => {
          const colors = {
            baixa: { bg: 'rgba(107,114,128,0.15)', color: '#6B7280', active: 'rgba(107,114,128,0.3)' },
            normal: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', active: 'rgba(59,130,246,0.3)' },
            alta: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', active: 'rgba(239,68,68,0.3)' },
          }
          const c = colors[p]
          const isActive = priority === p
          return (
            <button key={p} onClick={() => setPriority(p)}
              className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
              style={{
                background: isActive ? c.active : c.bg,
                color: c.color,
                border: isActive ? `1px solid ${c.color}40` : '1px solid transparent',
              }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          )
        })}
      </div>

      {/* Description */}
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descreva o problema (opcional)..."
        className="w-full h-16 rounded-md border px-3 py-2 text-xs bg-transparent resize-none"
        style={{ borderColor: 'hsl(var(--border))' }}
      />

      {/* Context badge */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>
          {source === 'crm_card' ? 'Vinculado ao Card' : 'Vinculado à Conversa'}
        </span>
        <span className="text-[9px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          ref: {referenceId.substring(0, 12)}...
        </span>
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={saving || !title.trim()}
        className="h-8 px-4 rounded-md text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
        style={{ background: !title.trim() ? 'hsl(var(--muted))' : 'hsl(var(--primary))', opacity: saving ? 0.7 : 1 }}
      >
        <Send size={12} />
        {saving ? 'Criando...' : 'Criar Ticket'}
      </button>
    </div>
  )
}
