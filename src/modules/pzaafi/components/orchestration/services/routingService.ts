// ─────────────────────────────────────────────────────────────
// Pzaafi — Routing Service
// Selects the best connector for a given payment request
// ─────────────────────────────────────────────────────────────

import type { ConnectorId, PaymentMethod } from '../../../types'
import type { ConnectorHealthState, RoutingDecision } from '../types'

// ── Internal health cache (in-memory, refreshed by orchestrationService) ──

let healthCache: Map<ConnectorId, ConnectorHealthState> = new Map()

export function updateHealthCache(states: ConnectorHealthState[]): void {
  healthCache = new Map(states.map((s) => [s.connector_id, s]))
}

export function getHealthCache(): Map<ConnectorId, ConnectorHealthState> {
  return healthCache
}

// ── Method support matrix (static fallback when health cache is empty) ──

const METHOD_SUPPORT: Record<ConnectorId, PaymentMethod[]> = {
  asaas: ['pix', 'boleto', 'credit_card'],
  pjbank: ['pix', 'boleto'],
  getnet: ['pix', 'credit_card', 'debit_card'],
}

// ── Routing Logic ────────────────────────────────────────────

/**
 * Select the best connector for a payment.
 *
 * Priority:
 *  1. Preferred connector (if healthy + supports method)
 *  2. Lowest avg_response_ms among healthy connectors that support the method
 *  3. First available connector that supports the method (no health data)
 */
export function selectConnector(
  method: PaymentMethod,
  preferredConnector?: ConnectorId,
): RoutingDecision {
  const candidates = getCandidates(method)

  // 1. Preferred connector
  if (preferredConnector) {
    const preferred = healthCache.get(preferredConnector)
    const supportsMethod = (preferred?.supported_methods ?? METHOD_SUPPORT[preferredConnector] ?? []).includes(method)

    if (supportsMethod && (preferred?.is_healthy !== false)) {
      return {
        connector_id: preferredConnector,
        reason: 'preferred_connector',
        confidence: 1,
        fallbacks: candidates.filter((c) => c !== preferredConnector),
      }
    }
  }

  // 2. Best healthy candidate by response time
  const healthyCandidates = candidates
    .map((id) => ({ id, health: healthCache.get(id) }))
    .filter((c) => c.health && c.health.is_healthy)
    .sort((a, b) => (a.health!.avg_response_ms - b.health!.avg_response_ms))

  if (healthyCandidates.length > 0) {
    const best = healthyCandidates[0]
    return {
      connector_id: best.id,
      reason: 'lowest_latency',
      confidence: 0.9,
      fallbacks: healthyCandidates.slice(1).map((c) => c.id),
    }
  }

  // 3. Static fallback — no health data available
  if (candidates.length > 0) {
    return {
      connector_id: candidates[0],
      reason: 'static_fallback',
      confidence: 0.5,
      fallbacks: candidates.slice(1),
    }
  }

  // No connector supports this method
  return {
    connector_id: 'asaas', // ultimate fallback
    reason: 'no_candidates_default',
    confidence: 0.1,
    fallbacks: [],
  }
}

/**
 * Select the next fallback connector after a failure.
 */
export function selectFallbackConnector(
  method: PaymentMethod,
  failedConnectors: ConnectorId[],
): ConnectorId | null {
  const candidates = getCandidates(method).filter((c) => !failedConnectors.includes(c))

  if (candidates.length === 0) return null

  // Pick healthiest among remaining
  const withHealth = candidates
    .map((id) => ({ id, health: healthCache.get(id) }))
    .filter((c) => c.health?.is_healthy !== false)
    .sort((a, b) => (a.health?.avg_response_ms ?? 9999) - (b.health?.avg_response_ms ?? 9999))

  return withHealth.length > 0 ? withHealth[0].id : candidates[0]
}

// ── Helpers ──────────────────────────────────────────────────

function getCandidates(method: PaymentMethod): ConnectorId[] {
  const ids: ConnectorId[] = ['asaas', 'pjbank', 'getnet']
  return ids.filter((id) => {
    const health = healthCache.get(id)
    const methods = health?.supported_methods ?? METHOD_SUPPORT[id] ?? []
    return methods.includes(method)
  })
}
