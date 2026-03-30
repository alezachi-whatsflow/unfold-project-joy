// Public Checkout — NO AUTH REQUIRED
// Route: /pay/:slug
// Buyer sees: product info + payment form + PIX/Card/Boleto options
// Branding: loads org logo + primary color from pzaafi_checkouts + pzaafi_organizations
// Flow: select method → fill form → submit → show payment instructions

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Use anon key for public access (no auth)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const publicSupabase = createClient(supabaseUrl, supabaseAnonKey)

interface CheckoutData {
  checkout: { id: string; name: string; slug: string; accepted_methods: string[]; max_installments: number; theme_config: Record<string,unknown> }
  product: { id: string; name: string; description: string; price_cents: number; product_type: string } | null
  org: { name: string; logo_url: string | null; primary_color: string | null }
}

type PaymentMethod = 'pix' | 'credit_card' | 'boleto'

const fmt = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export function PzaafiPublicCheckout() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [installments, setInstallments] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ pixCode?: string; pixQrCode?: string; boletoUrl?: string; status: string } | null>(null)

  // Load checkout data
  useEffect(() => {
    if (!slug) return
    async function load() {
      const { data: checkout, error: checkoutErr } = await publicSupabase
        .from('pzaafi_checkouts')
        .select('id, name, slug, accepted_methods, max_installments, theme_config, org_id')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle()

      if (checkoutErr || !checkout) { setError('Checkout não encontrado'); setLoading(false); return }

      const [{ data: org }, { data: product }] = await Promise.all([
        publicSupabase.from('pzaafi_organizations').select('name, logo_url, primary_color').eq('id', checkout.org_id).maybeSingle(),
        publicSupabase.from('pzaafi_products').select('id, name, description, price_cents, product_type').eq('checkout_id', checkout.id).eq('active', true).limit(1).maybeSingle(),
      ])

      setData({
        checkout,
        product,
        org: org ?? { name: 'Loja', logo_url: null, primary_color: null },
      })

      // Default to first accepted method
      if (checkout.accepted_methods?.length) {
        setMethod(checkout.accepted_methods[0] as PaymentMethod)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSubmit = async () => {
    if (!data || !name || !email) return
    setSubmitting(true)
    try {
      // Call pzaafi-checkout Edge Function (public, no auth needed for buyer)
      const res = await fetch(`${supabaseUrl}/functions/v1/pzaafi-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify({
          checkoutSlug: slug,
          buyerName: name,
          buyerEmail: email,
          buyerDocument: document || undefined,
          buyerPhone: phone || undefined,
          paymentMethod: method,
          installments: method === 'credit_card' ? installments : 1,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao processar pagamento')
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  // Render
  const primaryColor = data?.org?.primary_color || '#11bc76'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <p style={{ color: '#666', fontSize: 14 }}>Carregando checkout...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>Checkout indisponível</p>
          <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (result) {
    // Payment result screen
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {data?.org?.logo_url && <img src={data.org.logo_url} alt="" style={{ height: 40, marginBottom: 24 }} />}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 8 }}>Pagamento processado</h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>Status: {result.status}</p>

          {result.pixCode && (
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>PIX Copia e Cola:</p>
              <textarea readOnly value={result.pixCode} style={{ width: '100%', fontSize: 11, padding: 8, borderRadius: 4, border: '1px solid #ddd', resize: 'none', height: 60, fontFamily: 'monospace' }} onClick={e => (e.target as HTMLTextAreaElement).select()} />
              <button onClick={() => navigator.clipboard.writeText(result.pixCode!)} style={{ marginTop: 8, width: '100%', padding: '10px 0', background: primaryColor, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Copiar código PIX
              </button>
            </div>
          )}

          {result.boletoUrl && (
            <a href={result.boletoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '12px 0', background: primaryColor, color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Abrir Boleto
            </a>
          )}

          {method === 'credit_card' && (
            <p style={{ textAlign: 'center', fontSize: 14, color: primaryColor, fontWeight: 600 }}>Pagamento aprovado!</p>
          )}
        </div>
      </div>
    )
  }

  // Checkout form
  const price = data?.product?.price_cents ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header with branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {data?.org?.logo_url && <img src={data.org.logo_url} alt="" style={{ height: 48, marginBottom: 12 }} />}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#333' }}>{data?.checkout?.name}</h1>
          <p style={{ fontSize: 14, color: '#666' }}>{data?.org?.name}</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {/* Product info */}
          {data?.product && (
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{data.product.name}</p>
              {data.product.description && <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{data.product.description}</p>}
              <p style={{ fontSize: 24, fontWeight: 700, color: primaryColor, marginTop: 8 }}>{fmt(price)}</p>
            </div>
          )}

          {/* Payment method selector */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>Forma de pagamento</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(data?.checkout?.accepted_methods ?? []).map((m: string) => {
                const labels: Record<string,string> = { pix: 'PIX', credit_card: 'Cartão', boleto: 'Boleto' }
                const isActive = method === m
                return (
                  <button key={m} onClick={() => setMethod(m as PaymentMethod)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: isActive ? primaryColor : '#f5f5f5',
                    color: isActive ? '#fff' : '#666',
                    border: isActive ? 'none' : '1px solid #ddd',
                  }}>
                    {labels[m] ?? m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Buyer form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Nome completo *" value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
            <input placeholder="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
            <input placeholder="CPF/CNPJ" value={document} onChange={e => setDocument(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />
            <input placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} />

            {method === 'credit_card' && (
              <select value={installments} onChange={e => setInstallments(Number(e.target.value))} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}>
                {Array.from({ length: data?.checkout?.max_installments ?? 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}x de {fmt(Math.round(price / n))}{n === 1 ? ' à vista' : ''}</option>
                ))}
              </select>
            )}
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting || !name || !email} style={{
            width: '100%', marginTop: 20, padding: '14px 0', borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            background: (!name || !email) ? '#ccc' : primaryColor, color: '#fff',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Processando...' : `Pagar ${fmt(price)}`}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#999', marginTop: 16 }}>
            Pagamento seguro processado por Pzaafi
          </p>
        </div>
      </div>
    </div>
  )
}
