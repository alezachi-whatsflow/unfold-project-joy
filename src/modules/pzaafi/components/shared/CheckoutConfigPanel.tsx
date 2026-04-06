import { useState, useEffect, useMemo } from 'react'
import { X, Copy, Check, Link2, ShoppingBag } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface CheckoutConfigPanelProps {
  orgId: string
  orgName: string
  onClose: () => void
}

const PRODUCT_TYPES = [
  { value: 'digital', label: 'Digital' },
  { value: 'fisico', label: 'Físico' },
  { value: 'servico', label: 'Serviço' },
  { value: 'assinatura', label: 'Assinatura' },
] as const

const PAYMENT_METHODS = ['PIX', 'Cartão', 'Boleto'] as const

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CheckoutConfigPanel({ orgId, orgName, onClose }: CheckoutConfigPanelProps) {
  // Product fields
  const [productName, setProductName] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [priceDisplay, setPriceDisplay] = useState('')
  const [productType, setProductType] = useState<string>('digital')

  // Checkout fields
  const [checkoutName, setCheckoutName] = useState('')
  const [checkoutSlug, setCheckoutSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['PIX'])
  const [maxInstallments, setMaxInstallments] = useState(1)

  // UI
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-generate slug from checkout name
  useEffect(() => {
    if (!slugEdited && checkoutName) {
      setCheckoutSlug(slugify(checkoutName))
    }
  }, [checkoutName, slugEdited])

  // Format price input as BRL
  const handlePriceChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    setPriceCents(cents)
    setPriceDisplay(
      (cents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  }

  const checkoutUrl = useMemo(() => {
    if (!checkoutSlug) return ''
    return `/pay/${checkoutSlug}`
  }, [checkoutSlug])

  const toggleMethod = (method: string) => {
    setSelectedMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    )
  }

  const handleCopyLink = () => {
    if (!checkoutUrl) return
    const fullUrl = `${window.location.origin}${checkoutUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!productName.trim()) { toast.error('Informe o nome do produto'); return }
    if (priceCents <= 0) { toast.error('Informe o preço do produto'); return }
    if (!checkoutName.trim()) { toast.error('Informe o nome do checkout'); return }
    if (!checkoutSlug.trim()) { toast.error('Informe o slug do checkout'); return }
    if (selectedMethods.length === 0) { toast.error('Selecione ao menos um método de pagamento'); return }

    setSaving(true)

    try {
      // 1. Create/update product
      const { data: product, error: prodErr } = await supabase
        .from('pzaafi_products')
        .upsert(
          {
            org_id: orgId,
            name: productName.trim(),
            price_cents: priceCents,
            product_type: productType,
            active: true,
          },
          { onConflict: 'org_id,name' }
        )
        .select()
        .single()

      if (prodErr) {
        toast.error('Erro ao salvar produto: ' + prodErr.message)
        setSaving(false)
        return
      }

      // 2. Create/update checkout
      const { data: checkout, error: chkErr } = await supabase
        .from('pzaafi_checkouts')
        .upsert(
          {
            org_id: orgId,
            name: checkoutName.trim(),
            slug: checkoutSlug.trim(),
            accepted_methods: selectedMethods,
            max_installments: maxInstallments,
            active: true,
          },
          { onConflict: 'org_id,slug' }
        )
        .select()
        .single()

      if (chkErr) {
        toast.error('Erro ao salvar checkout: ' + chkErr.message)
        setSaving(false)
        return
      }

      // 3. Link product to checkout
      if (product && checkout) {
        await supabase
          .from('pzaafi_products')
          .update({ checkout_id: checkout.id })
          .eq('id', product.id)
      }

      toast.success('Checkout publicado!')
      onClose()
    } catch {
      toast.error('Erro inesperado ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderColor: 'hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
  }

  return (
    <div
      className="rounded-lg border mt-4 overflow-hidden"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted)/0.3)' }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} style={{ color: 'hsl(var(--primary))' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Configurar Checkout — {orgName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <X size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* 1. Produto */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Produto
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Nome do produto
              </label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Ex: Curso de Marketing"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Preço (R$)
              </label>
              <input
                type="text"
                value={priceDisplay}
                onChange={e => handlePriceChange(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Tipo
              </label>
              <select
                value={productType}
                onChange={e => setProductType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={inputStyle}
              >
                {PRODUCT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 2. Checkout */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Checkout
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Nome do checkout
              </label>
              <input
                type="text"
                value={checkoutName}
                onChange={e => setCheckoutName(e.target.value)}
                placeholder="Ex: Checkout Marketing"
                className="w-full px-3 py-2 text-sm rounded-md border"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                Slug
              </label>
              <input
                type="text"
                value={checkoutSlug}
                onChange={e => { setCheckoutSlug(e.target.value); setSlugEdited(true) }}
                placeholder="checkout-marketing"
                className="w-full px-3 py-2 text-sm rounded-md border font-mono"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Métodos aceitos
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => {
                const active = selectedMethods.includes(method)
                return (
                  <button
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
                    style={{
                      borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      background: active ? 'hsl(var(--primary)/0.1)' : 'transparent',
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {method}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Max installments */}
          <div className="max-w-[200px]">
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              Parcelamento máximo
            </label>
            <select
              value={maxInstallments}
              onChange={e => setMaxInstallments(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-md border"
              style={inputStyle}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </div>
        </section>

        {/* 3. Taxas */}
        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Taxas
          </h4>
          <DynamicFeeDisplay organizationId={orgId} />
        </section>

        {/* 4. Link do checkout */}
        {checkoutSlug && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Link do Checkout
            </h4>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-mono"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted)/0.2)', color: 'hsl(var(--foreground))' }}
              >
                <Link2 size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                {checkoutUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-md border transition-colors hover:bg-[hsl(var(--muted))]"
                style={{ borderColor: 'hsl(var(--border))' }}
                title="Copiar link"
              >
                {copied ? (
                  <Check size={14} style={{ color: 'hsl(142 71% 45%)' }} />
                ) : (
                  <Copy size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                )}
              </button>
            </div>
            <div
              className="w-24 h-24 rounded-md border flex items-center justify-center text-xs"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted)/0.2)', color: 'hsl(var(--muted-foreground))' }}
            >
              QR Code
            </div>
          </section>
        )}

        {/* 5. Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'hsl(var(--border)/0.5)' }}>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar e Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Dynamic Fee Display ── */
function DynamicFeeDisplay({ organizationId }: { organizationId: string }) {
  const [fees, setFees] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("pzaafi_fee_configs")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      setFees(data);
    })();
  }, [organizationId]);

  const pix = fees ? (fees.pix_gateway_fee_pct + fees.pix_pzaafi_fee_pct).toFixed(2) + "%" : "0,99%";
  const card = fees
    ? `${(fees.card_gateway_fee_pct + fees.card_pzaafi_fee_pct).toFixed(2)}% + R$ ${(fees.card_gateway_fee_fixed + fees.card_pzaafi_fee_fixed).toFixed(2)}`
    : "2,99% + R$ 0,49";
  const boleto = fees ? `R$ ${(fees.boleto_gateway_fee + fees.boleto_pzaafi_fee).toFixed(2)}` : "R$ 1,50";

  return (
    <div
      className="rounded-md p-3 space-y-1 text-xs"
      style={{ background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.5)' }}
    >
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>PIX</span>
        <span style={{ color: 'hsl(var(--foreground))' }}>{pix}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>Cartao</span>
        <span style={{ color: 'hsl(var(--foreground))' }}>{card}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--muted-foreground))' }}>Boleto</span>
        <span style={{ color: 'hsl(var(--foreground))' }}>{boleto}</span>
      </div>
      {fees?.tenant_markup_enabled && (
        <div className="flex justify-between pt-1 border-t border-border/30">
          <span style={{ color: 'hsl(270 60% 50%)' }}>Comissao</span>
          <span style={{ color: 'hsl(270 60% 50%)' }}>
            {fees.tenant_markup_pct > 0 ? `${fees.tenant_markup_pct}%` : ""}
            {fees.tenant_markup_pct > 0 && fees.tenant_markup_fixed > 0 ? " + " : ""}
            {fees.tenant_markup_fixed > 0 ? `R$ ${fees.tenant_markup_fixed.toFixed(2)}` : ""}
          </span>
        </div>
      )}
      <p className="pt-1 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {fees ? "Taxas configuradas pelo administrador" : "Taxas padrao (configure na engrenagem)"}
      </p>
    </div>
  );
}
