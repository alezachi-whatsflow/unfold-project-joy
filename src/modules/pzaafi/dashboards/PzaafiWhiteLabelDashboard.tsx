import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Settings, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { GatewayConfigModal } from '../components/shared/GatewayConfigModal'

type SubAccount = {
  id: string
  name: string
  document: string | null
  kyc_status: string
  active: boolean
  checkout_enabled: boolean
  created_at: string
  tenant_id: string
}

const KYC_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'hsl(38 92% 50% / 0.15)', text: 'hsl(38 92% 30%)',  label: 'Pendente' },
  approved: { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(142 71% 25%)', label: 'Aprovado' },
  rejected: { bg: 'hsl(0 84% 60% / 0.15)',   text: 'hsl(0 84% 35%)',   label: 'Rejeitado' },
}

export function PzaafiWhiteLabelDashboard() {
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [myOrgName, setMyOrgName] = useState<string>('')
  const [subaccounts, setSubaccounts] = useState<SubAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDoc, setNewDoc] = useState('')
  const [saving, setSaving] = useState(false)
  const [showGatewayModal, setShowGatewayModal] = useState(false)
  const [selectedOrgForGateway, setSelectedOrgForGateway] = useState<{ id: string; name: string } | null>(null)

  // Resolve the current user's org
  useEffect(() => {
    async function resolveOrg() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!ut?.tenant_id) { setLoading(false); return }

      const { data: org } = await supabase
        .from('pzaafi_organizations')
        .select('id, name')
        .eq('tenant_id', ut.tenant_id)
        .limit(1)
        .maybeSingle()
      if (org?.id) {
        setMyOrgId(org.id)
        setMyOrgName(org.name ?? '')
      }
      setLoading(false)
    }
    resolveOrg()
  }, [])

  const fetchSubaccounts = useCallback(async () => {
    if (!myOrgId) return
    const { data } = await supabase
      .from('pzaafi_organizations')
      .select('id, name, document, kyc_status, active, created_at, tenant_id')
      .eq('parent_org_id', myOrgId)
      .order('created_at', { ascending: false })

    const mapped = ((data as unknown as SubAccount[]) ?? []).map(s => ({
      ...s,
      checkout_enabled: s.active,
    }))
    setSubaccounts(mapped)
  }, [myOrgId])

  useEffect(() => { if (myOrgId) fetchSubaccounts() }, [myOrgId, fetchSubaccounts])

  const toggleCheckout = async (sub: SubAccount) => {
    const newVal = !sub.checkout_enabled
    // Optimistic UI
    setSubaccounts(prev => prev.map(s => s.id === sub.id ? { ...s, checkout_enabled: newVal } : s))

    const { error } = await supabase
      .from('pzaafi_organizations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    const { error: licErr } = await supabase
      .from('licenses')
      .update({
        pzaafi_tier: newVal ? 'cliente' : null,
        pzaafi_enabled_at: newVal ? new Date().toISOString() : null,
      })
      .eq('tenant_id', sub.tenant_id)

    if (error || licErr) {
      setSubaccounts(prev => prev.map(s => s.id === sub.id ? { ...s, checkout_enabled: !newVal } : s))
      toast.error('Erro ao atualizar checkout')
    } else {
      toast.success(newVal ? 'Checkout habilitado' : 'Checkout desabilitado')
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !myOrgId) return
    setSaving(true)
    // Get tenant_id
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
      .insert({
        name: newName.trim(),
        document: newDoc.trim() || null,
        tier: 'cliente',
        parent_org_id: myOrgId,
        tenant_id: ut.tenant_id,
      })
    setNewName('')
    setNewDoc('')
    setShowForm(false)
    setSaving(false)
    fetchSubaccounts()
  }

  const totalSub = subaccounts.length
  const activeSub = subaccounts.filter(s => s.active).length
  const checkoutCount = subaccounts.filter(s => s.checkout_enabled).length
  const pendingKyc = subaccounts.filter(s => s.kyc_status === 'pending').length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Pzaafi — Minha Carteira
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Gerencie suas subcontas e comissoes
          </p>
        </div>
        {myOrgId && (
          <button
            onClick={() => { setSelectedOrgForGateway({ id: myOrgId, name: myOrgName || 'Minha Org' }); setShowGatewayModal(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <CreditCard size={16} style={{ color: 'hsl(var(--primary))' }} />
            Configurar Gateway
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Subcontas', value: totalSub },
          { label: 'Ativas', value: activeSub },
          { label: 'Checkout Ativos', value: checkoutCount },
          { label: 'Pendente KYC', value: pendingKyc },
          { label: 'Comissao do Mes', value: '\u2014' },
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
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Subcontas</h2>
        <button
          onClick={() => setShowForm(f => !f)}
          className="px-4 py-2 text-sm font-medium rounded-md"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          + Nova Subconta
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
                placeholder="Nome da subconta"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>CNPJ</label>
              <input
                type="text"
                value={newDoc}
                onChange={e => setNewDoc(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
              />
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
                {['Nome', 'CNPJ', 'KYC', 'Status', 'Checkout', 'Gateway', 'Acoes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Carregando...
                  </td>
                </tr>
              ) : subaccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Nenhuma subconta encontrada
                  </td>
                </tr>
              ) : (
                subaccounts.map(sub => {
                  const kycStyle = KYC_STYLES[sub.kyc_status] ?? KYC_STYLES.pending
                  return (
                    <tr
                      key={sub.id}
                      className="border-t"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {sub.name}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {sub.document || '\u2014'}
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
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: sub.active ? 'hsl(142 71% 45% / 0.15)' : 'hsl(0 0% 50% / 0.15)',
                            color: sub.active ? 'hsl(142 71% 25%)' : 'hsl(0 0% 40%)',
                          }}
                        >
                          {sub.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleCheckout(sub)}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                          style={{ background: sub.checkout_enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
                          role="switch"
                          aria-checked={sub.checkout_enabled}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                            style={{
                              transform: sub.checkout_enabled ? 'translateX(18px)' : 'translateX(2px)',
                            }}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedOrgForGateway({ id: sub.id, name: sub.name }); setShowGatewayModal(true) }}
                          className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted))]"
                          title="Configurar Gateway"
                        >
                          <Settings size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {'\u2014'}
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
