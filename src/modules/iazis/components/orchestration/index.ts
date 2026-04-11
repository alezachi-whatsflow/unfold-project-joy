// ─────────────────────────────────────────────────────────────
// Pzaafi — Orchestration Module (Module B) — Re-exports
// ─────────────────────────────────────────────────────────────

// Types
export type {
  OrchestrationRequest,
  OrchestrationResult,
  RoutingDecision,
  OrchestrationAttempt,
  ConnectorHealthState,
} from './types'

// Services
export { selectConnector, selectFallbackConnector } from './services/routingService'
export { isFailoverCandidate, executeWithFailover, FailoverExhaustedError } from './services/failoverService'
export { orchestratePayment, syncConnectorHealth } from './services/orchestrationService'

// Hooks
export { usePzaafiOrchestration } from './hooks/usePzaafiOrchestration'
