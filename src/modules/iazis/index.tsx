import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { PzaafiNexusDashboard } from './dashboards/PzaafiNexusDashboard'
import { PzaafiWhiteLabelDashboard } from './dashboards/PzaafiWhiteLabelDashboard'
import { PzaafiClienteDashboard } from './dashboards/PzaafiClienteDashboard'

function IazisUpgradePrompt() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          IAZIS — Checkout & Pagamentos
        </h2>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Seu plano atual não inclui o módulo de pagamentos IAZIS.
          Entre em contato para ativar.
        </p>
      </div>
    </div>
  )
}

export function IazisModule() {
  const [tier, setTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkTier() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (data?.tenant_id) {
        const { data: license } = await supabase
          .from('licenses')
          .select('pzaafi_tier')
          .eq('tenant_id', data.tenant_id)
          .maybeSingle()
        setTier(license?.pzaafi_tier ?? null)
      }
      setLoading(false)
    }
    checkTier()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Carregando...</span>
      </div>
    )
  }

  if (!tier) return <IazisUpgradePrompt />

  switch (tier) {
    case 'nexus': return <PzaafiNexusDashboard />
    case 'whitelabel': return <PzaafiWhiteLabelDashboard />
    case 'cliente': return <PzaafiClienteDashboard />
    default: return <IazisUpgradePrompt />
  }
}

// Backward compat
export const PzaafiModule = IazisModule;
