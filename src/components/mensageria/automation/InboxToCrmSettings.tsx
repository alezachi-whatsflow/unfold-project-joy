// InboxToCrmSettings.tsx
// DB Logic: Settings stored in company_profile.automation_config (JSONB)
// Structure: {
//   inbox_to_crm_enabled: boolean,
//   target_pipeline_id: uuid,
//   target_stage_id: uuid,
//   custom_field_mappings: Array<{ key: string, label: string, source: string }>
// }
// Update: supabase.from('company_profile').update({ automation_config: {...} }).eq('tenant_id', tenantId)

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Lock, Plus, Trash2, Zap, ZapOff } from 'lucide-react'

// Core fields (locked, always mapped)
const CORE_FIELDS = [
  { key: 'phone', label: 'Telefone', icon: '\u{1F4F1}' },
  { key: 'name', label: 'Nome', icon: '\u{1F464}' },
  { key: 'company', label: 'Empresa', icon: '\u{1F3E2}' },
  { key: 'email', label: 'E-mail', icon: '\u{2709}\u{FE0F}' },
  { key: 'social', label: 'Redes Sociais', icon: '\u{1F310}' },
  { key: 'channel', label: 'Canal de Entrada', icon: '\u{1F4E1}' },
]

export function InboxToCrmSettings() {
  const [enabled, setEnabled] = useState(false)
  const [pipelines, setPipelines] = useState<Array<{id:string,name:string,stages:any[]}>>([])
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [customFields, setCustomFields] = useState<Array<{key:string,label:string}>>([])
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [saving, setSaving] = useState(false)

  // Load pipelines
  useEffect(() => {
    supabase.from('sales_pipelines').select('id, name, stages').then(({ data }) => {
      setPipelines(data ?? [])
    })
  }, [])

  // Load current config
  useEffect(() => {
    const tId = localStorage.getItem('whatsflow_default_tenant_id')
    if (!tId) return
    supabase.from('company_profile').select('automation_config').eq('tenant_id', tId).maybeSingle()
      .then(({ data }) => {
        const cfg = data?.automation_config as any
        if (cfg) {
          setEnabled(cfg.inbox_to_crm_enabled ?? false)
          setSelectedPipeline(cfg.target_pipeline_id ?? '')
          setSelectedStage(cfg.target_stage_id ?? '')
          setCustomFields(cfg.custom_field_mappings ?? [])
        }
      })
  }, [])

  const stages = pipelines.find(p => p.id === selectedPipeline)?.stages ?? []

  const handleSave = async () => {
    setSaving(true)
    const tId = localStorage.getItem('whatsflow_default_tenant_id')
    // DB Logic: update company_profile.automation_config JSONB
    const { error } = await supabase
      .from('company_profile')
      .update({
        automation_config: {
          inbox_to_crm_enabled: enabled,
          target_pipeline_id: selectedPipeline || null,
          target_stage_id: selectedStage || null,
          custom_field_mappings: customFields,
        }
      })
      .eq('tenant_id', tId)
    setSaving(false)
    if (error) toast.error('Erro ao salvar configurações')
    else toast.success('Automação atualizada')
  }

  const addCustomField = () => {
    if (!newFieldKey || !newFieldLabel) return
    setCustomFields(prev => [...prev, { key: newFieldKey, label: newFieldLabel }])
    setNewFieldKey(''); setNewFieldLabel('')
  }

  return (
    <div className="space-y-6">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Captura Automatica Inbox &rarr; CRM
          </h3>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Cria um card no pipeline automaticamente ao receber nova mensagem
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{ background: enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Pipeline + Stage selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Pipeline de destino</label>
              <select value={selectedPipeline} onChange={e => { setSelectedPipeline(e.target.value); setSelectedStage('') }}
                className="w-full h-9 rounded-md border px-2 text-sm bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
                <option value="">Selecione...</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'hsl(var(--foreground))' }}>Etapa inicial</label>
              <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}
                className="w-full h-9 rounded-md border px-2 text-sm bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
                <option value="">Selecione...</option>
                {(Array.isArray(stages) ? stages : []).map((s: any, i: number) => <option key={i} value={s.name || s.id || i}>{s.name || `Etapa ${i+1}`}</option>)}
              </select>
            </div>
          </div>

          {/* Core fields (locked) */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>Campos mapeados (fixos)</p>
            <div className="grid grid-cols-3 gap-2">
              {CORE_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.5)' }}>
                  <span className="text-sm">{f.icon}</span>
                  <span className="text-xs font-medium flex-1" style={{ color: 'hsl(var(--foreground))' }}>{f.label}</span>
                  <Lock size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Custom fields (JSONB) */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>Campos personalizados (custom_fields)</p>
            {customFields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-1 rounded" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>{f.key}</span>
                <span className="text-xs flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.label}</span>
                <button onClick={() => setCustomFields(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 size={12} style={{ color: 'hsl(var(--destructive))' }} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input placeholder="Chave (ex: utm_source)" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)}
                className="h-8 rounded-md border px-2 text-xs bg-transparent flex-1" style={{ borderColor: 'hsl(var(--border))' }} />
              <input placeholder="Label (ex: Origem)" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                className="h-8 rounded-md border px-2 text-xs bg-transparent flex-1" style={{ borderColor: 'hsl(var(--border))' }} />
              <button onClick={addCustomField} className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: 'hsl(var(--primary))', color: '#fff' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-4 rounded-md text-sm font-medium text-white" style={{ background: 'hsl(var(--primary))', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </>
      )}
    </div>
  )
}
