import { supabase } from '@/integrations/supabase/client'

export type NotificationCategory = 'mensageria' | 'crm' | 'financeiro' | 'tickets' | 'sla' | 'sistema'

interface CreateNotification {
  userId: string
  category: NotificationCategory
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(input: CreateNotification): Promise<void> {
  const tId = localStorage.getItem('whatsflow_default_tenant_id')
  if (!tId) return

  // Check user preferences first
  const { data: prefs } = await (supabase as any)
    .from('notification_preferences')
    .select(input.category)
    .eq('user_id', input.userId)
    .maybeSingle()

  // If user has explicitly disabled this category, don't create
  if (prefs && prefs[input.category] === false) return

  await (supabase as any)
    .from('notifications')
    .insert({
      tenant_id: tId,
      user_id: input.userId,
      category: input.category,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    })
}

export async function markAsRead(notificationId: string): Promise<void> {
  await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await (supabase as any)
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  return count ?? 0
}
