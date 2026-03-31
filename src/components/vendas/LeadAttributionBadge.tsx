// LeadAttributionBadge.tsx
// DB Logic: Reads from negocios.custom_fields.source (JSONB)
// or whatsapp_leads.lead_tags for attribution data

import { Globe, Instagram, Facebook, Search, MessageSquare, Megaphone } from 'lucide-react'

const SOURCE_CONFIG: Record<string, { icon: typeof Globe; color: string; bg: string; label: string }> = {
  'meta_ads': { icon: Facebook, color: '#1877F2', bg: 'rgba(24,119,242,0.12)', label: 'Meta Ads' },
  'google_ads': { icon: Search, color: '#4285F4', bg: 'rgba(66,133,244,0.12)', label: 'Google Ads' },
  'instagram': { icon: Instagram, color: '#E4405F', bg: 'rgba(228,64,95,0.12)', label: 'Instagram' },
  'whatsapp': { icon: MessageSquare, color: '#25D366', bg: 'rgba(37,211,102,0.12)', label: 'WhatsApp' },
  'organic': { icon: Globe, color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Organico' },
  'referral': { icon: Megaphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Indicação' },
  'campaign': { icon: Megaphone, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Campanha' },
}

interface Props {
  source?: string | string[] | null
  customFields?: Record<string, unknown> | null
}

export function LeadAttributionBadge({ source, customFields }: Props) {
  // Resolve sources from multiple possible locations
  const sources: string[] = []
  if (typeof source === 'string') sources.push(source)
  if (Array.isArray(source)) sources.push(...source)
  if (customFields?.source) {
    if (typeof customFields.source === 'string') sources.push(customFields.source)
    if (Array.isArray(customFields.source)) sources.push(...(customFields.source as string[]))
  }
  if (customFields?.utm_source && typeof customFields.utm_source === 'string') sources.push(customFields.utm_source)

  if (!sources.length) return null

  const unique = [...new Set(sources)]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {unique.map(s => {
        const key = s.toLowerCase().replace(/[\s-]/g, '_')
        const cfg = SOURCE_CONFIG[key] ?? { icon: Globe, color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted)/0.3)', label: s }
        const Icon = cfg.icon
        return (
          <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: cfg.bg, color: cfg.color }}>
            <Icon size={10} />
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}
