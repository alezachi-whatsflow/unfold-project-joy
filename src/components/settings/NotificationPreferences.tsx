import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const PREF_CATEGORIES = [
  { key: 'mensageria',  label: 'Mensageria',      desc: 'Nova mensagem, conversa na fila' },
  { key: 'crm',         label: 'CRM / Pipeline',   desc: 'Lead criado, mudança de etapa' },
  { key: 'financeiro',  label: 'Financeiro',        desc: 'Pagamento recebido, cobrança vencida' },
  { key: 'tickets',     label: 'Tickets',           desc: 'Ticket aberto, atualização' },
  { key: 'sla',         label: 'SLA',               desc: 'SLA prestes a vencer, vencido' },
  { key: 'sistema',     label: 'Sistema',           desc: 'Backup, manutenção, updates' },
] as const

export function NotificationPreferences() {
  const [userId, setUserId] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    mensageria: true, crm: true, financeiro: true,
    tickets: true, sla: true, sistema: false, sound_enabled: true,
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setPrefs({
          mensageria: data.mensageria,
          crm: data.crm,
          financeiro: data.financeiro,
          tickets: data.tickets,
          sla: data.sla,
          sistema: data.sistema,
          sound_enabled: data.sound_enabled,
        })
      }
      setLoaded(true)
    })()
  }, [])

  async function toggle(key: string) {
    if (!userId) return
    const newVal = !prefs[key]
    setPrefs((p) => ({ ...p, [key]: newVal }))

    const tenantId = localStorage.getItem('whatsflow_default_tenant_id')
    await (supabase as any)
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          ...prefs,
          [key]: newVal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
  }

  if (!loaded) return null

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        padding: 24,
        maxWidth: 480,
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'hsl(var(--foreground))' }}>
        Preferencias de Notificacao
      </h3>

      {PREF_CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: '1px solid hsl(var(--border) / 0.4)',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))' }}>{cat.label}</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{cat.desc}</div>
          </div>
          <ToggleSwitch checked={prefs[cat.key]} onChange={() => toggle(cat.key)} />
        </div>
      ))}

      <div style={{ height: 1, background: 'hsl(var(--border))', margin: '8px 0' }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0 0',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))' }}>Som de notificacao</div>
        </div>
        <ToggleSwitch checked={prefs.sound_enabled} onChange={() => toggle('sound_enabled')} />
      </div>
    </div>
  )
}

/* ── simple toggle switch ────────────────────────────────── */
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}
