import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useWindowSize } from '@/hooks/useWindowSize'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
export type TimelineStage = {
  id: string
  label: string
  labelMobile: string
  status: 'done' | 'current' | 'pending'
  timestamp?: string
}

type UserTimelineRowProps = {
  id: string
  name: string
  initials: string
  role: string
  roleColor?: 'red' | 'blue' | 'green' | 'amber' | 'purple'
  stages: TimelineStage[]
  overallStatus: 'active' | 'pending' | 'blocked' | 'inactive'
  expiresAt?: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

// ─────────────────────────────────────────────
// MAPEAMENTO DE CORES
// ─────────────────────────────────────────────
const STATUS_CONFIG = {
  active:   { bar: '#11BC76', glow: 'rgba(17,188,118,0.4)',  label: 'Ativo',    pill: 'rgba(17,188,118,0.15)',  text: '#39F7B2' },
  pending:  { bar: '#F59E0B', glow: 'rgba(245,158,11,0.4)', label: 'Pendente', pill: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  blocked:  { bar: '#EF4444', glow: 'rgba(239,68,68,0.4)',  label: 'Bloqueado',pill: 'rgba(239,68,68,0.15)',  text: '#EF4444' },
  inactive: { bar: '#4B5563', glow: 'rgba(75,85,99,0.3)',   label: 'Inativo',  pill: 'rgba(75,85,99,0.15)',   text: '#6B7280' },
}

const ROLE_COLORS_MAP = {
  red:    { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)' },
  blue:   { color: '#4A9EFF', bg: 'rgba(74,158,255,0.12)',   border: 'rgba(74,158,255,0.25)' },
  green:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.25)' },
  amber:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.25)' },
  purple: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)',  border: 'rgba(167,139,250,0.25)' },
}

const STAGE_STATUS_STYLES = {
  done: {
    pill:   'rgba(17,188,118,0.12)',
    border: 'rgba(17,188,118,0.25)',
    text:   '#39F7B2',
    dot:    '#11BC76',
    pulse:  false,
  },
  current: {
    pill:   'rgba(17,188,118,0.22)',
    border: '#11BC76',
    text:   '#39F7B2',
    dot:    '#11BC76',
    pulse:  true,
  },
  pending: {
    pill:   'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    text:   '#3D6B52',
    dot:    '#2A4A3A',
    pulse:  false,
  },
}

// ─────────────────────────────────────────────
// SUBCOMPONENTE: Stage Pill
// ─────────────────────────────────────────────
function StagePill({ stage, compact = false }: { stage: TimelineStage; compact?: boolean }) {
  const s = STAGE_STATUS_STYLES[stage.status]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        padding: compact ? '4px 8px' : '6px 12px',
        borderRadius: 20,
        background: s.pill,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'all 150ms ease',
        cursor: 'default',
      }}
      title={stage.timestamp}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
          animation: s.pulse ? 'wf-pulse 1.5s infinite' : 'none',
        }}
      />
      {compact ? stage.labelMobile : stage.label}
    </div>
  )
}

// ─────────────────────────────────────────────
// SUBCOMPONENTE: Arrow separator
// ─────────────────────────────────────────────
function StageArrow() {
  return <span style={{ color: '#1A6B4A', fontSize: 14, userSelect: 'none' }}>›</span>
}

// ─────────────────────────────────────────────
// Action buttons
// ─────────────────────────────────────────────
function ActionButtons({ id, onEdit, onDelete }: { id: string; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={() => onEdit?.(id)}
        style={{
          width: 30, height: 30, borderRadius: 8,
          border: '1px solid rgba(74,158,255,0.2)',
          background: 'rgba(74,158,255,0.08)',
          color: '#4A9EFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 150ms ease',
        }}
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={() => onDelete?.(id)}
        style={{
          width: 30, height: 30, borderRadius: 8,
          border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.08)',
          color: '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 150ms ease',
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export function UserTimelineRow({
  id, name, initials, role, roleColor = 'red',
  stages, overallStatus, expiresAt, onEdit, onDelete,
}: UserTimelineRowProps) {
  const [hovered, setHovered] = useState(false)
  const { width } = useWindowSize()
  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1280
  const sc = STATUS_CONFIG[overallStatus]
  const rc = ROLE_COLORS_MAP[roleColor]

  const avatarSize = isMobile ? 36 : isTablet ? 38 : 42

  const avatar = (
    <div
      style={{
        width: avatarSize, height: avatarSize,
        borderRadius: '50%',
        background: sc.pill,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isMobile ? 12 : 14, fontWeight: 700,
        color: sc.text,
        border: `1.5px solid ${sc.bar}33`,
        flexShrink: 0, letterSpacing: '-0.5px',
      }}
    >
      {initials}
    </div>
  )

  const nameBlock = (
    <div style={{ minWidth: isMobile ? 0 : isTablet ? 130 : 160, flex: '0 0 auto' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>
        {name}
      </div>
      <span
        style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          color: rc.color, background: rc.bg,
          border: `1px solid ${rc.border}`,
          borderRadius: 20, padding: '2px 8px',
          display: 'inline-block', marginTop: 3,
        }}
      >
        {role}
      </span>
    </div>
  )

  const pills = (
    <div
      className="wf-stage-pills"
      style={{
        display: 'flex', alignItems: 'center',
        gap: 6, flex: isMobile ? undefined : 1,
        justifyContent: isMobile ? 'flex-start' : 'center',
        flexWrap: 'nowrap', minWidth: 0,
        width: isMobile ? '100%' : undefined,
        overflowX: isMobile ? 'auto' : undefined,
        paddingBottom: isMobile ? 2 : undefined,
      }}
    >
      {stages.map((stage, idx) => (
        <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
          {idx > 0 && <StageArrow />}
          <StagePill stage={stage} compact={isMobile || isTablet} />
        </div>
      ))}
    </div>
  )

  return (
    <div
      className="wf-timeline-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: hovered ? 'rgba(255,255,255,0.02)' : 'hsl(var(--card))',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'hsl(var(--border))'}`,
        borderRadius: isMobile ? 14 : 'var(--radius)',
        overflow: 'hidden', transition: 'all 150ms ease', cursor: 'default',
      }}
    >
      {/* Barra lateral de status */}
      <div
        style={{
          width: 5, background: sc.bar, flexShrink: 0,
          boxShadow: hovered ? `0 0 14px ${sc.glow}` : `0 0 8px ${sc.glow}`,
          transition: 'box-shadow 150ms ease',
        }}
      />

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, padding: 14 }}>
          {/* Linha 1: Avatar + Nome + Botões */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {avatar}
              {nameBlock}
            </div>
            <ActionButtons id={id} onEdit={onEdit} onDelete={onDelete} />
          </div>
          {/* Linha 2: Pills */}
          {pills}
          {/* Linha 3: Data/Status */}
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            {expiresAt || sc.label}
          </div>
        </div>
      ) : (
        <div
          className="wf-timeline-content"
          style={{
            display: 'flex', alignItems: 'center',
            gap: 14, flex: 1, padding: '12px 16px', flexWrap: 'wrap',
          }}
        >
          {avatar}
          {nameBlock}
          {pills}
          {/* Data + Ações */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: overallStatus === 'active' ? 'hsl(var(--muted-foreground))' : sc.text,
            }}>
              {expiresAt || sc.label}
            </div>
            <ActionButtons id={id} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  )
}
