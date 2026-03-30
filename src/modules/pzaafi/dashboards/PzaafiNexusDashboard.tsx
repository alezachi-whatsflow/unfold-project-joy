import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

type Org = {
  id: string
  name: string
  tier: string
  kyc_status: string
  active: boolean
  document: string | null
  created_at: string
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

  const fetchOrgs = useCallback(async () => {
    const { data } = await supabase
      .from('pzaafi_organizations')
      .select('id, name, tier, kyc_status, active, document, created_at')
      .order('created_at', { ascending: false })
    setOrgs((data as Org[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const toggleActive = async (org: Org) => {
    await supabase
      .from('pzaafi_organizations')
      .update({ active: !org.active })
      .eq('id', org.id)
    setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, active: !o.active } : o))
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs', value: totalOrgs },
          { label: 'Ativas', value: activeCount },
          { label: 'Pendente KYC', value: pendingKyc },
          { label: 'MRR Pzaafi', value: '—' },
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
                {['Nome', 'Tier', 'KYC', 'Status', 'Acoes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Carregando...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
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
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {org.document || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
