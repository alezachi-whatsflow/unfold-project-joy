import type { TimelineStage } from '@/components/nexus/UserTimelineRow'

type NexusUserDB = {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
  invite_sent_at?: string | null
  invite_accepted_at?: string | null
}

export function buildUserStages(user: NexusUserDB): TimelineStage[] {
  const inviteSent = !!user.invite_sent_at
  const inviteAccepted = !!user.invite_accepted_at
  const isActive = user.is_active && !!user.last_login

  return [
    {
      id: 'invite',
      label: 'Convite Enviado',
      labelMobile: '✉',
      status: inviteSent ? 'done' : 'pending',
      timestamp: user.invite_sent_at
        ? fmtDateTime(user.invite_sent_at)
        : undefined,
    },
    {
      id: 'link',
      label: 'Link Acessado',
      labelMobile: '🔗',
      status: inviteAccepted
        ? 'done'
        : inviteSent
          ? 'current'
          : 'pending',
      timestamp: user.invite_accepted_at
        ? fmtDateTime(user.invite_accepted_at)
        : undefined,
    },
    {
      id: 'active',
      label: 'Conta Ativa',
      labelMobile: '✓',
      status: isActive ? 'done' : inviteAccepted ? 'current' : 'pending',
      timestamp: user.last_login
        ? fmtDateTime(user.last_login)
        : undefined,
    },
  ]
}

export function getUserOverallStatus(user: NexusUserDB): 'active' | 'pending' | 'blocked' | 'inactive' {
  if (!user.is_active) return 'inactive'
  if (user.last_login) return 'active'
  if (user.invite_accepted_at) return 'pending'
  if (user.invite_sent_at) return 'pending'
  return 'inactive'
}

export function getRoleColor(role: string): 'red' | 'blue' | 'green' | 'amber' | 'purple' {
  const map: Record<string, 'red' | 'blue' | 'green' | 'amber' | 'purple'> = {
    nexus_superadmin: 'red',
    nexus_dev_senior: 'purple',
    nexus_suporte_senior: 'blue',
    nexus_financeiro: 'amber',
    nexus_suporte_junior: 'blue',
    nexus_customer_success: 'green',
  }
  return map[role] || 'blue'
}
