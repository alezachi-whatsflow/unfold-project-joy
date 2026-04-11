import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

type WalletSummary = {
  available: number
  pending: number
  blocked: number
  disputed: number
}

type Order = {
  id: string
  buyer_name: string
  total_cents: number
  status: string
  created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: 'hsl(38 92% 50% / 0.15)', text: 'hsl(38 92% 30%)',  label: 'Pendente' },
  processing: { bg: 'hsl(220 80% 50% / 0.15)', text: 'hsl(220 80% 30%)', label: 'Processando' },
  paid:       { bg: 'hsl(142 71% 45% / 0.15)', text: 'hsl(142 71% 25%)', label: 'Pago' },
  failed:     { bg: 'hsl(0 84% 60% / 0.15)',   text: 'hsl(0 84% 35%)',   label: 'Falhou' },
  refunded:   { bg: 'hsl(270 60% 50% / 0.15)', text: 'hsl(270 60% 35%)', label: 'Reembolsado' },
  disputed:   { bg: 'hsl(0 84% 60% / 0.15)',   text: 'hsl(0 84% 35%)',   label: 'Disputa' },
  expired:    { bg: 'hsl(0 0% 50% / 0.15)',     text: 'hsl(0 0% 40%)',    label: 'Expirado' },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function PzaafiClienteDashboard() {
  const [wallet, setWallet] = useState<WalletSummary>({ available: 0, pending: 0, blocked: 0, disputed: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!ut?.tenant_id) { setLoading(false); return }

      // Get org id
      const { data: org } = await supabase
        .from('pzaafi_organizations')
        .select('id')
        .eq('tenant_id', ut.tenant_id)
        .limit(1)
        .maybeSingle()
      if (!org?.id) { setLoading(false); return }

      // Fetch wallet balances (aggregate all wallet accounts for this org)
      const { data: wallets } = await supabase
        .from('pzaafi_wallet_accounts')
        .select('balance_available, balance_pending, balance_blocked, balance_disputed')
        .eq('org_id', org.id)

      if (wallets && wallets.length > 0) {
        const agg = (wallets as Array<{ balance_available: number; balance_pending: number; balance_blocked: number; balance_disputed: number }>).reduce(
          (acc, w) => ({
            available: acc.available + (w.balance_available ?? 0),
            pending: acc.pending + (w.balance_pending ?? 0),
            blocked: acc.blocked + (w.balance_blocked ?? 0),
            disputed: acc.disputed + (w.balance_disputed ?? 0),
          }),
          { available: 0, pending: 0, blocked: 0, disputed: 0 },
        )
        setWallet(agg)
      }

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('pzaafi_orders')
        .select('id, buyer_name, total_cents, status, created_at')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setOrders((recentOrders as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const walletCards = [
    { label: 'Disponivel', value: wallet.available, color: 'hsl(142 71% 45%)' },
    { label: 'Pendente', value: wallet.pending, color: 'hsl(38 92% 50%)' },
    { label: 'Bloqueado', value: wallet.blocked, color: 'hsl(0 84% 60%)' },
    { label: 'Em disputa', value: wallet.disputed, color: 'hsl(270 60% 50%)' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Pzaafi — Meus Pagamentos
        </h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Acompanhe seus saldos e pedidos recentes
        </p>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {walletCards.map(card => (
          <div
            key={card.label}
            className="rounded-lg border p-4"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
          >
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{card.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Pedidos Recentes</h2>
        <button
          disabled
          className="px-4 py-2 text-sm font-medium rounded-md opacity-50 cursor-not-allowed"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          title="Em breve"
        >
          Criar Checkout
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))' }}>
                {['Data', 'Comprador', 'Valor', 'Status', 'Acoes'].map(h => (
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending
                  return (
                    <tr
                      key={order.id}
                      className="border-t"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <td className="px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {fmtDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {order.buyer_name}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {fmt(order.total_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: statusStyle.bg, color: statusStyle.text }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        —
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
