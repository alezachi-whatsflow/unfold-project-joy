// ─────────────────────────────────────────────────────────────
// Pzaafi — Failover Service
// Handles retry logic with connector failover
// ─────────────────────────────────────────────────────────────

import type { ConnectorId, CreateChargePayload, ChargeResult } from '../../../types'
import type { OrchestrationAttempt } from '../types'
import { getConnector } from '../../../connectors/registry'
import { selectFallbackConnector } from './routingService'

// ── Failover-eligible errors ─────────────────────────────────

const FAILOVER_ERROR_PATTERNS = [
  'timeout',
  'ECONNREFUSED',
  'ENOTFOUND',
  '502',
  '503',
  '504',
  'rate_limit',
  'service_unavailable',
  'gateway_timeout',
]

/**
 * Determine whether an error should trigger failover to another connector.
 * Card-declined or validation errors should NOT trigger failover.
 */
export function isFailoverCandidate(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return FAILOVER_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  )
}

// ── Execute with failover ────────────────────────────────────

export interface FailoverResult {
  charge_result: ChargeResult
  connector_id: ConnectorId
  attempts: OrchestrationAttempt[]
}

/**
 * Execute a charge against the primary connector; if it fails with a
 * failover-eligible error, automatically try fallback connectors.
 */
export async function executeWithFailover(
  primaryConnector: ConnectorId,
  payload: CreateChargePayload,
  maxRetries: number = 1,
): Promise<FailoverResult> {
  const attempts: OrchestrationAttempt[] = []
  const failedConnectors: ConnectorId[] = []
  let currentConnector = primaryConnector

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = new Date().toISOString()

    try {
      const connector = getConnector(currentConnector)
      const result = await connector.createCharge(payload)

      attempts.push({
        connector_id: currentConnector,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        success: true,
      })

      return {
        charge_result: result,
        connector_id: currentConnector,
        attempts,
      }
    } catch (error) {
      attempts.push({
        connector_id: currentConnector,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })

      failedConnectors.push(currentConnector)

      // Only failover on infrastructure errors
      if (!isFailoverCandidate(error) || attempt >= maxRetries) {
        throw new FailoverExhaustedError(
          `All connectors failed for method ${payload.method}`,
          attempts,
        )
      }

      // Select next connector
      const next = selectFallbackConnector(payload.method, failedConnectors)
      if (!next) {
        throw new FailoverExhaustedError(
          `No fallback connectors available for method ${payload.method}`,
          attempts,
        )
      }

      currentConnector = next
      console.warn(
        `[Failover] ${failedConnectors.at(-1)} failed, trying ${currentConnector}`,
      )
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new FailoverExhaustedError('Failover loop ended unexpectedly', attempts)
}

// ── Custom error ─────────────────────────────────────────────

export class FailoverExhaustedError extends Error {
  public readonly attempts: OrchestrationAttempt[]

  constructor(message: string, attempts: OrchestrationAttempt[]) {
    super(message)
    this.name = 'FailoverExhaustedError'
    this.attempts = attempts
  }
}
