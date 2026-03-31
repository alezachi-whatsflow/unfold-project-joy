// MessageScheduler.tsx
// DB Logic: INSERT into message_queue table
// Structure: {
//   id: uuid, tenant_id: uuid, instance_name: text,
//   remote_jid: text, body: text, media_url: text,
//   scheduled_at: timestamptz, status: 'scheduled'|'sent'|'failed'|'cancelled',
//   created_by: uuid, created_at: timestamptz
// }
// Query: supabase.from('message_queue').insert({ ... })

import { useState } from 'react'
import { Clock, X, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Props {
  remoteJid: string
  instanceName: string
  onScheduled?: () => void
}

export function MessageScheduler({ remoteJid, instanceName, onScheduled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSchedule = async () => {
    if (!message || !date || !time) {
      toast.error('Preencha mensagem, data e hora')
      return
    }
    setSaving(true)
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
    const tId = localStorage.getItem('whatsflow_default_tenant_id')

    // DB Logic: INSERT into whatsapp_messages for scheduled delivery
    // The BullMQ schedule-worker picks up jobs with scheduled_at in the future
    const { error } = await supabase.from('whatsapp_messages').insert({
      instance_name: instanceName,
      remote_jid: remoteJid,
      body: message,
      direction: 'outgoing',
      type: 'text',
      status: 0, // pending
      tenant_id: tId,
      created_at: scheduledAt, // Future timestamp = scheduled
    })

    setSaving(false)
    if (error) {
      toast.error('Erro ao agendar mensagem')
    } else {
      toast.success(`Mensagem agendada para ${date} às ${time}`)
      setMessage(''); setDate(''); setTime('')
      setIsOpen(false)
      onScheduled?.()
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="p-2 rounded-md transition-colors hover:bg-[hsl(var(--muted))]" title="Agendar mensagem">
        <Clock size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
      </button>
    )
  }

  return (
    <div className="absolute bottom-full mb-2 right-0 w-80 rounded-lg p-4 z-50"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Agendar Mensagem</span>
        </div>
        <button onClick={() => setIsOpen(false)}><X size={14} style={{ color: 'hsl(var(--muted-foreground))' }} /></button>
      </div>

      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Mensagem..."
        className="w-full h-16 rounded-md border px-3 py-2 text-sm bg-transparent resize-none mb-2"
        style={{ borderColor: 'hsl(var(--border))' }} />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
      </div>

      <button onClick={handleSchedule} disabled={saving || !message || !date || !time}
        className="w-full h-8 rounded-md text-xs font-medium text-white flex items-center justify-center gap-1"
        style={{ background: (!message || !date || !time) ? 'hsl(var(--muted))' : 'hsl(var(--primary))', opacity: saving ? 0.7 : 1 }}>
        <Send size={12} /> {saving ? 'Agendando...' : 'Agendar Envio'}
      </button>
    </div>
  )
}
