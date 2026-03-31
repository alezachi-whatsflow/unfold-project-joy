// StageAutomationModal.tsx
//
// DB Logic — Table: pipeline_stage_automations
// Structure: {
//   id: uuid PRIMARY KEY,
//   tenant_id: uuid NOT NULL,
//   pipeline_id: uuid NOT NULL REFERENCES sales_pipelines(id),
//   stage_name: text NOT NULL,  -- name of the stage that triggers
//   action_type: text NOT NULL CHECK (action_type IN ('send_whatsapp','send_email','move_stage','add_tag','notify_agent')),
//   action_config: JSONB NOT NULL DEFAULT '{}',
//   -- action_config examples:
//   --   send_whatsapp: { template: "Olá {{name}}, ...", delay_minutes: 0 }
//   --   send_email: { subject: "...", body: "..." }
//   --   add_tag: { tag: "qualificado" }
//   --   notify_agent: { message: "Novo lead qualificado" }
//   active: boolean DEFAULT true,
//   created_at: timestamptz DEFAULT now()
// }
//
// DB Trigger Logic:
// A Supabase Database Webhook listens to UPDATE on negocios table.
// When negocios.stage changes (old.stage != new.stage):
//   1. Webhook fires Edge Function: automation-stage-trigger
//   2. Edge Function queries pipeline_stage_automations WHERE stage_name = new.stage
//   3. For each active automation:
//      - send_whatsapp → enqueue in BullMQ msg:transactional
//      - send_email → call email service
//      - add_tag → update negocios.tags
//      - notify_agent → create notification
//
// Setup SQL:
// CREATE TABLE IF NOT EXISTS pipeline_stage_automations (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL,
//   pipeline_id UUID NOT NULL,
//   stage_name TEXT NOT NULL,
//   action_type TEXT NOT NULL,
//   action_config JSONB NOT NULL DEFAULT '{}',
//   active BOOLEAN DEFAULT true,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE pipeline_stage_automations ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "tenant_isolation" ON pipeline_stage_automations FOR ALL
//   USING (tenant_id IN (SELECT get_my_tenant_ids()));

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Zap, MessageSquare, Mail, Tag, Bell, ArrowRight } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  pipelineId: string
  pipelineName: string
  stages: Array<{ name: string; color?: string }>
}

type ActionType = 'send_whatsapp' | 'send_email' | 'add_tag' | 'notify_agent'

interface Automation {
  id: string
  stage_name: string
  action_type: ActionType
  action_config: Record<string, string>
  active: boolean
}

const ACTION_TYPES: Array<{ type: ActionType; label: string; icon: typeof MessageSquare; color: string }> = [
  { type: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare, color: '#25D366' },
  { type: 'send_email', label: 'Enviar E-mail', icon: Mail, color: '#3B82F6' },
  { type: 'add_tag', label: 'Adicionar Tag', icon: Tag, color: '#8B5CF6' },
  { type: 'notify_agent', label: 'Notificar Atendente', icon: Bell, color: '#F59E0B' },
]

export function StageAutomationModal({ isOpen, onClose, pipelineId, pipelineName, stages }: Props) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  // New automation form
  const [newStage, setNewStage] = useState('')
  const [newAction, setNewAction] = useState<ActionType>('send_whatsapp')
  const [newConfig, setNewConfig] = useState<Record<string, string>>({})

  // Load existing automations
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    const tId = localStorage.getItem('whatsflow_default_tenant_id')
    // DB Logic: SELECT from pipeline_stage_automations WHERE pipeline_id = X
    supabase
      .from('pipeline_stage_automations')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setAutomations(data as Automation[])
        setLoading(false)
      })
  }, [isOpen, pipelineId])

  const handleAdd = async () => {
    if (!newStage) { toast.error('Selecione uma etapa'); return }
    const tId = localStorage.getItem('whatsflow_default_tenant_id')

    // DB Logic: INSERT into pipeline_stage_automations
    const { data, error } = await supabase
      .from('pipeline_stage_automations')
      .insert({
        tenant_id: tId,
        pipeline_id: pipelineId,
        stage_name: newStage,
        action_type: newAction,
        action_config: newConfig,
        active: true,
      })
      .select()
      .single()

    if (error) {
      // Table might not exist yet — show helpful message
      if (error.code === '42P01') {
        toast.error('Tabela de automações não encontrada. Execute a migration.')
      } else {
        toast.error('Erro ao criar automação')
      }
      return
    }

    setAutomations(prev => [...prev, data as Automation])
    setNewStage(''); setNewConfig({})
    toast.success('Automação criada')
  }

  const toggleActive = async (id: string, active: boolean) => {
    // Optimistic
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active } : a))

    const { error } = await supabase
      .from('pipeline_stage_automations')
      .update({ active })
      .eq('id', id)

    if (error) {
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
      toast.error('Erro ao atualizar')
    }
  }

  const deleteAutomation = async (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id))
    await supabase.from('pipeline_stage_automations').delete().eq('id', id)
    toast.success('Automação removida')
  }

  // Config input based on action type
  const renderConfigInput = (actionType: ActionType, config: Record<string, string>, onChange: (c: Record<string, string>) => void) => {
    switch (actionType) {
      case 'send_whatsapp':
        return (
          <textarea value={config.template ?? ''} onChange={e => onChange({ ...config, template: e.target.value })}
            placeholder="Olá {{name}}, sua proposta está em análise..."
            className="w-full h-16 rounded-md border px-3 py-2 text-xs bg-transparent resize-none" style={{ borderColor: 'hsl(var(--border))' }} />
        )
      case 'send_email':
        return (
          <div className="space-y-2">
            <input value={config.subject ?? ''} onChange={e => onChange({ ...config, subject: e.target.value })}
              placeholder="Assunto do e-mail" className="w-full h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
            <textarea value={config.body ?? ''} onChange={e => onChange({ ...config, body: e.target.value })}
              placeholder="Corpo do e-mail..." className="w-full h-12 rounded-md border px-2 py-1.5 text-xs bg-transparent resize-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        )
      case 'add_tag':
        return (
          <input value={config.tag ?? ''} onChange={e => onChange({ ...config, tag: e.target.value })}
            placeholder="Nome da tag (ex: qualificado)" className="w-full h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
        )
      case 'notify_agent':
        return (
          <input value={config.message ?? ''} onChange={e => onChange({ ...config, message: e.target.value })}
            placeholder="Mensagem de notificação" className="w-full h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-lg p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color: 'hsl(var(--primary))' }} />
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Automações por Etapa</h3>
              <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{pipelineName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[hsl(var(--muted))]">
            <X size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        {/* Existing automations */}
        {automations.length > 0 && (
          <div className="space-y-2 mb-5">
            {automations.map(a => {
              const actionCfg = ACTION_TYPES.find(t => t.type === a.action_type)!
              const Icon = actionCfg.icon
              const stageCfg = stages.find(s => s.name === a.stage_name)
              return (
                <div key={a.id} className="flex items-center gap-2 rounded-md p-3"
                  style={{ background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.5)', opacity: a.active ? 1 : 0.5 }}>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: stageCfg?.color ?? 'hsl(var(--muted))', color: '#fff' }}>
                    {a.stage_name}
                  </span>
                  <ArrowRight size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <Icon size={14} style={{ color: actionCfg.color }} />
                  <span className="text-xs flex-1" style={{ color: 'hsl(var(--foreground))' }}>{actionCfg.label}</span>
                  <button onClick={() => toggleActive(a.id, !a.active)}
                    className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors"
                    style={{ background: a.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
                    <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${a.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => deleteAutomation(a.id)}>
                    <Trash2 size={12} style={{ color: 'hsl(var(--destructive))' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add new automation */}
        <div className="rounded-md p-4" style={{ background: 'hsl(var(--muted)/0.2)', border: '1px solid hsl(var(--border)/0.3)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'hsl(var(--foreground))' }}>Nova Automação</p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Quando entrar em</label>
              <select value={newStage} onChange={e => setNewStage(e.target.value)}
                className="w-full h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
                <option value="">Etapa...</option>
                {stages.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Executar ação</label>
              <select value={newAction} onChange={e => setNewAction(e.target.value as ActionType)}
                className="w-full h-8 rounded-md border px-2 text-xs bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
                {ACTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Config input */}
          <div className="mb-3">
            {renderConfigInput(newAction, newConfig, setNewConfig)}
          </div>

          <button onClick={handleAdd} disabled={!newStage}
            className="h-8 px-3 rounded-md text-xs font-medium text-white flex items-center gap-1"
            style={{ background: !newStage ? 'hsl(var(--muted))' : 'hsl(var(--primary))' }}>
            <Plus size={12} /> Adicionar Automação
          </button>
        </div>

        {/* Info */}
        <p className="text-[10px] mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          As automações são disparadas automaticamente quando um card muda de etapa no pipeline.
        </p>
      </div>
    </div>
  )
}
