import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import { GatewayConfigModal } from '../components/shared/GatewayConfigModal'

type Org = {
  id: string
  name: string
  tier: string
  kyc_status: string
  active: boolean
  checkout_enabled: boolean
  document: string | null
  created_at: string
  tenant_id: string
}

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  nexus:      { bg: 'hsl(45 93% 47% / 0.15)', text: 'hsl(45 93% 30%)',  label: 'Nexus' },
  whitelabel: { bg: 'hsl(270 60% 50% / 0.15)', text: 'hsl(270 60% 35%)', label: 'WhiteLabel' },
  cliente:    { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(142 71% 25%)', label: 'Cliente' },
}

const KYC_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'hsl(38 92% 50% / 0.15)', text: 'hsl(38 92% 30%)',  label: 'Pendente' },
  approved: { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(142 71% 25%)', label: 'Aprovado' },
  rejected: { bg: 'hsl(0 84% 60% / 0.15)',   text: 'hsl(0 84% 35%)',   label: 'Rejeitado' },
}

export function PzaafiNexusDashboard() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTier, setNewTier] = useState<string>('cliente')
  const [saving, setSaving] = useState(false)
  const [showGatewayModal, setShowGatewayModal] = useState(false)
  const [selectedOrgForGateway, setSelectedOrgForGateway] = useState<{ id: string; name: string } | null>(null)

  const fetchOrgs = useCallback(async () => {
    const { data } = await supabase
      .from('pzaafi_organizations')
      .select('id, name, tier, kyc_status, active, document, created_at, tenant_id')
      .order('created_at', { ascending: false })

    // Map checkout_enabled from active field (reuse existing)
    const mapped = ((data as unknown as Org[]) ?? []).map(o => ({
      ...o,
      checkout_enabled: o.active,
    }))
    setOrgs(mapped)
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const toggleActive = async (org: Org) => {
    const newVal = !org.active
    // Optimistic UI
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, active: newVal } : o))
    const { error } = await supabase
      .from('pzaafi_organizations')
      .update({ active: newVal })
      .eq('id', org.id)
    if (error) {
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, active: !newVal } : o))
      toast.error('Erro ao atualizar status')
    }
  }

  const toggleCheckout = async (org: Org) => {
    const newVal = !org.checkout_enabled
    // Optimistic UI
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, checkout_enabled: newVal } : o))

    const { error } = await supabase
      .from('pzaafi_organizations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', org.id)

    // Also update the license metadata
    const { error: licErr } = await supabase
      .from('licenses')
      .update({
        pzaafi_tier: newVal ? org.tier : null,
        pzaafi_enabled_at: newVal ? new Date().toISOString() : null,
      })
      .eq('tenant_id', org.tenant_id)

    if (error || licErr) {
      // Revert optimistic
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, checkout_enabled: !newVal } : o))
      toast.error('Erro ao atualizar checkout')
    } else {
      toast.success(newVal ? 'Checkout habilitado' : 'Checkout desabilitado')
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    // Get current user's tenant_id for the new org
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: ut } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (!ut?.tenant_id) { setSaving(false); return }

    await supabase
      .from('pzaafi_organizations')
      .insert({ name: newName.trim(), tier: newTier, tenant_id: ut.tenant_id })
    setNewName('')
    setNewTier('cliente')
    setShowForm(false)
    setSaving(false)
    fetchOrgs()
  }

  const totalOrgs = orgs.length
  const activeCount = orgs.filter(o => o.active).length
  const checkoutCount = orgs.filter(o => o.checkout_enabled).length
  const pendingKyc = orgs.filter(o => o.kyc_status === 'pending').length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Pzaafi — Painel Nexus
        </h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Gerenciamento global de organizacoes e pagamentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orgs', value: totalOrgs },
          { label: 'Ativas', value: activeCount },
          { label: 'Checkout Ativos', value: checkoutCount },
          { label: 'Pendente KYC', value: pendingKyc },
          { label: 'MRR Pzaafi', value: '\u2014' },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="rounded-lg border p-4"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
          >
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{kpi.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Organizacoes</h2>
        <button
          onClick={() => setShowForm(f => !f)}
          className="px-4 py-2 text-sm font-medium rounded-md"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          + Nova Organizacao
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Nome</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome da organizacao"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Tier</label>
              <select
                value={newTier}
                onChange={e => setNewTier(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
              >
                <option value="nexus">Nexus</option>
                <option value="whitelabel">WhiteLabel</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {saving ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))' }}>
                {['Nome', 'Tier', 'KYC', 'Status', 'Checkout', 'Acoes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Carregando...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Nenhuma organizacao encontrada
                  </td>
                </tr>
              ) : (
                orgs.map(org => {
                  const tierStyle = TIER_STYLES[org.tier] ?? TIER_STYLES.cliente
                  const kycStyle = KYC_STYLES[org.kyc_status] ?? KYC_STYLES.pending
                  return (
                    <tr
                      key={org.id}
                      className="border-t"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {org.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: tierStyle.bg, color: tierStyle.text }}
                        >
                          {tierStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: kycStyle.bg, color: kycStyle.text }}
                        >
                          {kycStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(org)}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                          style={{ background: org.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                          role="switch"
                          aria-checked={org.active}
                        >
                          <span
                            className="pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform"
                            style={{
                              background: 'hsl(var(--background))',
                              transform: org.active ? 'translateX(16px)' : 'translateX(0)',
                            }}
                          />
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleCheckout(org)}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                          style={{ background: org.checkout_enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                          role="switch"
                          aria-checked={org.checkout_enabled}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                            style={{
                              transform: org.checkout_enabled ? 'translateX(18px)' : 'translateX(2px)',
                            }}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedOrgForGateway({ id: org.id, name: org.name }); setShowGatewayModal(true) }}
                          className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted))]"
                          title="Configurar Gateway"
                        >
                          <Settings size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Modal */}
      {selectedOrgForGateway && (
        <GatewayConfigModal
          orgId={selectedOrgForGateway.id}
          orgName={selectedOrgForGateway.name}
          isOpen={showGatewayModal}
          onClose={() => { setShowGatewayModal(false); setSelectedOrgForGateway(null) }}
        />
      )}
    </div>
  )
}
