// Pzaafi Module — Entry point
// Routes to the correct dashboard based on pzaafi_tier

export function PzaafiModule() {
  // TODO: implement tier routing after dashboards are built
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <div className="text-4xl">🏦</div>
        <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Pzaafi — Payment Orchestration
        </h2>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Módulo em fase de implementação (Foundation concluída)
        </p>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          18 tabelas · RLS · Ledger double-entry · 3 tiers
        </p>
      </div>
    </div>
  )
}
