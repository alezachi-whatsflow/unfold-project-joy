// SequenceBuilderUI.tsx
// DB Logic: Sequences stored in automation_sequences table
// Structure: {
//   id: uuid, tenant_id: uuid, name: text, active: boolean,
//   steps: JSONB Array<{
//     order: number, type: 'send_whatsapp'|'send_email'|'wait'|'condition',
//     config: { template_id?: string, delay_hours?: number, channel?: string, message?: string }
//   }>,
//   trigger: JSONB { event: 'lead_created'|'stage_changed'|'tag_added', filter?: object },
//   created_at: timestamptz
// }

import { useState } from 'react'
import { Plus, MessageSquare, Clock, Mail, Trash2, GripVertical, Zap } from 'lucide-react'
import { toast } from 'sonner'

type StepType = 'send_whatsapp' | 'wait' | 'send_email'

interface Step {
  id: string
  order: number
  type: StepType
  config: { message?: string; delay_hours?: number; template_id?: string }
}

const STEP_TYPES: Array<{ type: StepType; label: string; icon: typeof MessageSquare; color: string }> = [
  { type: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare, color: '#25D366' },
  { type: 'wait', label: 'Aguardar', icon: Clock, color: '#F59E0B' },
  { type: 'send_email', label: 'Enviar E-mail', icon: Mail, color: '#3B82F6' },
]

export function SequenceBuilderUI() {
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [trigger, setTrigger] = useState('lead_created')

  const addStep = (type: StepType) => {
    setSteps(prev => [...prev, {
      id: crypto.randomUUID(),
      order: prev.length + 1,
      type,
      config: type === 'wait' ? { delay_hours: 24 } : { message: '' },
    }])
  }

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const updateStep = (id: string, config: Partial<Step['config']>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, config: { ...s.config, ...config } } : s))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
          <Zap size={16} style={{ color: 'hsl(var(--primary))' }} />
          Construtor de Sequencia
        </h3>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Crie cadencias automatizadas de contato com o lead
        </p>
      </div>

      {/* Name + Trigger */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Follow-up pos-contato"
            className="w-full h-9 rounded-md border px-3 text-sm bg-transparent" style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--foreground))' }}>Gatilho</label>
          <select value={trigger} onChange={e => setTrigger(e.target.value)}
            className="w-full h-9 rounded-md border px-2 text-sm bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
            <option value="lead_created">Lead criado</option>
            <option value="stage_changed">Mudanca de etapa</option>
            <option value="tag_added">Tag adicionada</option>
          </select>
        </div>
      </div>

      {/* Steps visual */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const cfg = STEP_TYPES.find(t => t.type === step.type)!
          const Icon = cfg.icon
          return (
            <div key={step.id} className="flex items-start gap-2">
              {/* Connector line */}
              <div className="flex flex-col items-center pt-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: cfg.color }}>{step.order}</div>
                {idx < steps.length - 1 && <div className="w-0.5 h-8" style={{ background: 'hsl(var(--border))' }} />}
              </div>
              {/* Step card */}
              <div className="flex-1 rounded-md p-3" style={{ background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border)/0.5)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: cfg.color }} />
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{cfg.label}</span>
                  </div>
                  <button onClick={() => removeStep(step.id)}><Trash2 size={12} style={{ color: 'hsl(var(--destructive))' }} /></button>
                </div>
                {step.type === 'wait' ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={step.config.delay_hours ?? 24} onChange={e => updateStep(step.id, { delay_hours: Number(e.target.value) })}
                      className="w-16 h-7 rounded border px-2 text-xs bg-transparent text-center" style={{ borderColor: 'hsl(var(--border))' }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>horas</span>
                  </div>
                ) : (
                  <textarea value={step.config.message ?? ''} onChange={e => updateStep(step.id, { message: e.target.value })}
                    placeholder={step.type === 'send_whatsapp' ? 'Mensagem WhatsApp...' : 'Conteudo do e-mail...'}
                    className="w-full h-12 rounded border px-2 py-1.5 text-xs bg-transparent resize-none" style={{ borderColor: 'hsl(var(--border))' }} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add step buttons */}
      <div className="flex items-center gap-2">
        {STEP_TYPES.map(t => (
          <button key={t.type} onClick={() => addStep(t.type)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors hover:opacity-80"
            style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
            <Plus size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Save */}
      {steps.length > 0 && (
        <button onClick={() => toast.success('Sequencia salva (implementacao completa no MVP 2)')}
          className="h-9 px-4 rounded-md text-sm font-medium text-white" style={{ background: 'hsl(var(--primary))' }}>
          Salvar Sequencia
        </button>
      )}
    </div>
  )
}
