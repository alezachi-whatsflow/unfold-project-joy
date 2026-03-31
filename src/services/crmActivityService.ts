// crmActivityService.ts
// DB Logic: All activities stored in crm_activities table
// Structure: {
//   id: uuid, tenant_id: uuid, card_id: uuid (nullable - links to negocios),
//   contact_jid: text (nullable - links to whatsapp contact),
//   activity_type: text ('whatsapp_msg'|'whatsapp_scheduled'|'note'|'call'|'email'|
//                        'stage_change'|'tag_added'|'file_attached'|'meeting'),
//   content: JSONB { text?, from?, to?, duration?, filename?, old_stage?, new_stage? },
//   performed_by: uuid (user who performed the action),
//   performed_by_name: text,
//   created_at: timestamptz
// }

import { supabase } from '@/integrations/supabase/client'

export type ActivityType =
  | 'whatsapp_msg' | 'whatsapp_scheduled' | 'whatsapp_received'
  | 'note' | 'call' | 'email'
  | 'stage_change' | 'tag_added' | 'file_attached' | 'meeting'
  | 'lead_created' | 'assigned' | 'ticket_opened'

interface LogActivityInput {
  cardId?: string | null
  contactJid?: string | null
  activityType: ActivityType
  content: Record<string, unknown>
  performedBy?: string
  performedByName?: string
}

export async function logCrmActivity(input: LogActivityInput): Promise<void> {
  const tId = localStorage.getItem('whatsflow_default_tenant_id')
  if (!tId) return

  // Fire and forget — don't block the main action
  supabase
    .from('crm_activities' as any)
    .insert({
      tenant_id: tId,
      card_id: input.cardId ?? null,
      contact_jid: input.contactJid ?? null,
      activity_type: input.activityType,
      content: input.content,
      performed_by: input.performedBy ?? null,
      performed_by_name: input.performedByName ?? null,
    })
    .then(({ error }: { error: any }) => {
      if (error) console.warn('[crm-activity] Failed to log:', error.message)
    })
}

// Convenience helpers
export function logWhatsAppSent(contactJid: string, text: string, cardId?: string) {
  logCrmActivity({
    cardId, contactJid,
    activityType: 'whatsapp_msg',
    content: { text, direction: 'outgoing' },
  })
}

export function logWhatsAppReceived(contactJid: string, text: string, cardId?: string) {
  logCrmActivity({
    cardId, contactJid,
    activityType: 'whatsapp_received',
    content: { text, direction: 'incoming' },
  })
}

export function logWhatsAppScheduled(contactJid: string, text: string, scheduledAt: string, cardId?: string) {
  logCrmActivity({
    cardId, contactJid,
    activityType: 'whatsapp_scheduled',
    content: { text, scheduled_at: scheduledAt },
  })
}

export function logNote(cardId: string, text: string, authorName: string) {
  logCrmActivity({
    cardId,
    activityType: 'note',
    content: { text },
    performedByName: authorName,
  })
}

export function logCall(cardId: string, duration: number, notes: string, contactJid?: string) {
  logCrmActivity({
    cardId, contactJid,
    activityType: 'call',
    content: { duration_seconds: duration, notes },
  })
}

export function logStageChange(cardId: string, oldStage: string, newStage: string, performedByName?: string) {
  logCrmActivity({
    cardId,
    activityType: 'stage_change',
    content: { old_stage: oldStage, new_stage: newStage },
    performedByName,
  })
}

export function logTagAdded(cardId: string, tag: string) {
  logCrmActivity({
    cardId,
    activityType: 'tag_added',
    content: { tag },
  })
}

export function logAssigned(cardId: string, assigneeName: string) {
  logCrmActivity({
    cardId,
    activityType: 'assigned',
    content: { assignee: assigneeName },
  })
}

export function logTicketOpened(params: {
  cardId?: string
  contactJid?: string
  ticketId: string
  title: string
  priority: string
  source: string
  performedByName?: string
}) {
  logCrmActivity({
    cardId: params.cardId,
    contactJid: params.contactJid,
    activityType: 'ticket_opened' as ActivityType,
    content: {
      ticket_id: params.ticketId,
      title: params.title,
      priority: params.priority,
      source: params.source,
    },
    performedByName: params.performedByName,
  })
}
