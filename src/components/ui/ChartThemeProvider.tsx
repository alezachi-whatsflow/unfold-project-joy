import { useTheme } from 'next-themes'

interface ChartPalette {
  primary: string
  secondary: string
  tertiary: string
  grid: string
  text: string
  tooltip: { bg: string; border: string; text: string }
  colors: string[]
}

const palettes: Record<string, ChartPalette> = {
  'cafe-noturno': {
    primary: '#11bc76',
    secondary: '#c49a3c',
    tertiary: '#5b8dd9',
    grid: 'rgba(255,255,255,0.06)',
    text: '#828a94',
    tooltip: { bg: '#252a30', border: '#2e3540', text: '#e8e0d0' },
    colors: ['#11bc76', '#c49a3c', '#5b8dd9', '#e06b6b', '#a78bfa'],
  },
  'pacifico': {
    primary: '#0fa468',
    secondary: '#BA7517',
    tertiary: '#378ADD',
    grid: 'rgba(0,0,0,0.06)',
    text: '#6b6b60',
    tooltip: { bg: '#fafaf8', border: '#dedad4', text: '#1a1a16' },
    colors: ['#0fa468', '#BA7517', '#378ADD', '#e06b6b', '#a78bfa'],
  },
  'cosmos': {
    primary: '#11bc76',
    secondary: '#4a8fe8',
    tertiary: '#c49a3c',
    grid: 'rgba(255,255,255,0.05)',
    text: '#6a7590',
    tooltip: { bg: '#111520', border: 'rgba(255,255,255,0.08)', text: '#e2e8f0' },
    colors: ['#11bc76', '#4a8fe8', '#c49a3c', '#f472b6', '#a78bfa'],
  },
}

export const useChartColors = (): ChartPalette => {
  const { theme } = useTheme()
  return palettes[theme as keyof typeof palettes] ?? palettes['cosmos']
}

export const ChartTooltip = ({ active, payload, label }: any) => {
  const colors = useChartColors()
  if (!active || !payload?.length) return null

  return (
    <div
      style={{
        background: colors.tooltip.bg,
        border: `0.5px solid ${colors.tooltip.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        color: colors.tooltip.text,
      }}
    >
      {label && <p style={{ marginBottom: 4, opacity: 0.7 }}>{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}
