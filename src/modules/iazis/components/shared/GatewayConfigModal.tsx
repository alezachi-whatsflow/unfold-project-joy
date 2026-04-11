import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, CreditCard } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Props {
  orgId: string
  orgName: string
  isOpen: boolean
  onClose: () => void
}

export function GatewayConfigModal({ orgId, orgName, isOpen, onClose }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connectorId] = useState('asaas') // Default connector

  // Load existing credentials
  useEffect(() => {
    if (!isOpen || !orgId) return
    supabase
      .from('pzaafi_provider_connections')
      .select('credentials, webhook_secret')
      .eq('org_id', orgId)
      .eq('connector_id', connectorId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const creds = data.credentials as Record<string, string> ?? {}
          setApiKey(creds.api_key ?? '')
          setWebhookSecret(data.webhook_secret ?? '')
        } else {
          setApiKey('')
          setWebhookSecret('')
        }
      })
  }, [isOpen, orgId, connectorId])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('pzaafi_provider_connections')
      .upsert({
        org_id: orgId,
        connector_id: connectorId,
        display_name: 'Asaas',
        credentials: { api_key: apiKey },
        webhook_secret: webhookSecret,
        active: true,
        is_primary: true,
        health_status: 'unknown',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,connector_id' })

    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar credenciais')
    } else {
      toast.success('Gateway configurado com sucesso')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-lg p-6" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard size={18} style={{ color: 'hsl(var(--primary))' }} />
            <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Gateway de Pagamento</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-[hsl(var(--muted))]">
            <X size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        {/* Org name */}
        <p className="text-xs mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Configurando gateway para: <strong style={{ color: 'hsl(var(--foreground))' }}>{orgName}</strong>
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
              Chave API (access_token)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="$aas_..."
                className="w-full h-9 rounded-md border px-3 pr-9 text-sm bg-transparent"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>
              Webhook Secret (opcional)
            </label>
            <input
              type="text"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder="Token de verificacao do webhook"
              className="w-full h-9 rounded-md border px-3 text-sm bg-transparent"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>

          {/* Connector info */}
          <div className="rounded-md p-3" style={{ background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.5)' }}>
            <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Conector ativo
            </p>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Asaas</p>
            <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              PIX - Cartao de Credito - Boleto
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-4" style={{ borderTop: '1px solid hsl(var(--border)/0.5)' }}>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="h-9 px-4 rounded-md text-sm font-medium text-white transition-colors"
            style={{
              background: (!apiKey) ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Gateway'}
          </button>
        </div>
      </div>
    </div>
  )
}
