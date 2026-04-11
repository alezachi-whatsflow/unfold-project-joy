// ─────────────────────────────────────────────────────────────
// Pzaafi — Orchestration Types (Module B)
// ─────────────────────────────────────────────────────────────

import type {
  ConnectorId,
  PaymentMethod,
  Money,
  CreateChargePayload,
  ChargeResult,
  PaymentStatus,
} from '../../types'

// ── Orchestration Request ────────────────────────────────────

/** Payload sent to the orchestration layer */
export interface OrchestrationRequest {
  organization_id: string
  order_id: string
  payload: CreateChargePayload
  /** Preferred connector (optional — routing will pick one if omitted) */
  preferred_connector?: ConnectorId
  /** Max retry attempts on failover (default: 1) */
  max_retries?: number
}

// ── Routing Decision ─────────────────────────────────────────

/** Result of the routing engine decision */
export interface RoutingDecision {
  connector_id: ConnectorId
  reason: string
  /** Confidence score 0-1 (1 = forced choice) */
  confidence: number
  /** Fallback connectors in priority order */
  fallbacks: ConnectorId[]
}

// ── Orchestration Result ─────────────────────────────────────

/** Final result returned by the orchestration layer */
export interface OrchestrationResult {
  success: boolean
  payment_id?: string
  connector_id: ConnectorId
  charge_result?: ChargeResult
  status: PaymentStatus
  /** Which connectors were attempted (in order) */
  attempts: OrchestrationAttempt[]
  duration_ms: number
}

/** Single attempt log entry */
export interface OrchestrationAttempt {
  connector_id: ConnectorId
  started_at: string
  ended_at: string
  success: boolean
  error?: string
}

// ── Connector Health ─────────────────────────────────────────

/** Cached health state for a connector */
export interface ConnectorHealthState {
  connector_id: ConnectorId
  is_healthy: boolean
  last_check: string
  /** Consecutive failure count */
  failure_count: number
  /** Average response time (ms) over last N calls */
  avg_response_ms: number
  /** Methods supported by this connector */
  supported_methods: PaymentMethod[]
}
