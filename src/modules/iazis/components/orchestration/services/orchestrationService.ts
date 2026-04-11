// ─────────────────────────────────────────────────────────────
// Pzaafi — Orchestration Service
// Central entry point for payment orchestration
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import type { ConnectorId } from '../../../types'
import type {
  OrchestrationRequest,
  OrchestrationResult,
  ConnectorHealthState,
} from '../types'
import { selectConnector, updateHealthCache } from './routingService'
import { executeWithFailover, FailoverExhaustedError } from './failoverService'

// ── Main orchestrate function ────────────────────────────────

/**
 * Orchestrate a payment end-to-end:
 *  1. Route to the best connector
 *  2. Execute with automatic failover
 *  3. Persist the payment record
 *  4. Return the result
 */
export async function orchestratePayment(
  request: OrchestrationRequest,
): Promise<OrchestrationResult> {
  const start = Date.now()

  // 1. Route
  const routing = selectConnector(
    request.payload.method,
    request.preferred_connector,
  )

  console.info(
    `[Orchestration] Routed to ${routing.connector_id} (${routing.reason}, confidence=${routing.confidence})`,
  )

  try {
    // 2. Execute with failover
    const { charge_result, connector_id, attempts } = await executeWithFailover(
      routing.connector_id,
      request.payload,
      request.max_retries ?? 1,
    )

    // 3. Persist payment record
    const paymentId = await persistPayment(request, connector_id, charge_result)

    // 4. Return success
    return {
      success: true,
      payment_id: paymentId,
      connector_id,
      charge_result,
      status: charge_result.status,
      attempts,
      duration_ms: Date.now() - start,
    }
  } catch (error) {
    // All connectors failed
    const attempts =
      error instanceof FailoverExhaustedError ? error.attempts : []

    return {
      success: false,
      connector_id: routing.connector_id,
      status: 'failed',
      attempts,
      duration_ms: Date.now() - start,
    }
  }
}

// ── Connector Health Sync ────────────────────────────────────

/**
 * Fetch connector health states from Supabase and update the in-memory cache.
 * Call this on app startup and periodically (e.g., every 60s).
 */
export async function syncConnectorHealth(
  organizationId: string,
): Promise<ConnectorHealthState[]> {
  const { data, error } = await supabase
    .from('pzaafi_connector_health')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[Orchestration] Failed to sync connector health:', error.message)
    return []
  }

  const states: ConnectorHealthState[] = (data ?? []).map((row: any) => ({
    connector_id: row.connector_id as ConnectorId,
    is_healthy: row.is_healthy,
    last_check: row.last_check,
    failure_count: row.failure_count ?? 0,
    avg_response_ms: row.avg_response_ms ?? 0,
    supported_methods: row.supported_methods ?? [],
  }))

  updateHealthCache(states)
  return states
}

// ── Internal helpers ─────────────────────────────────────────

async function persistPayment(
  request: OrchestrationRequest,
  connectorId: ConnectorId,
  chargeResult: any,
): Promise<string> {
  const { data, error } = await supabase
    .from('pzaafi_payments')
    .insert({
      order_id: request.order_id,
      organization_id: request.organization_id,
      connector_id: connectorId,
      method: request.payload.method,
      status: chargeResult.status,
      amount: request.payload.amount,
      fee: 0,
      net: request.payload.amount,
      provider_id: chargeResult.provider_id,
      pix_qr_code: chargeResult.pix_qr_code,
      pix_copy_paste: chargeResult.pix_copy_paste,
      boleto_url: chargeResult.boleto_url,
      boleto_barcode: chargeResult.boleto_barcode,
      metadata: request.payload.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Orchestration] Failed to persist payment:', error.message)
    throw new Error(`Payment persistence failed: ${error.message}`)
  }

  return data.id
}
