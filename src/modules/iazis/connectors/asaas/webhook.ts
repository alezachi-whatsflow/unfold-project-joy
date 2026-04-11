import type { NormalizedWebhookEvent } from '../../types'
import type { AsaasWebhookEvent, AsaasChargeStatus } from './types'
import { mapAsaasStatus, asaasToCents } from './mappers'

/**
 * Verify Asaas webhook authenticity.
 * Asaas sends an access token in the header — simple string comparison.
 */
export function verifyAsaasWebhook(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false
  return token === expectedToken
}

/**
 * Map raw Asaas event string to the canonical event_type on NormalizedWebhookEvent.
 */
function toCanonicalEventType(
  event: string,
): NormalizedWebhookEvent['event_type'] | null {
  const map: Record<string, NormalizedWebhookEvent['event_type']> = {
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    PAYMENT_RECEIVED_IN_CASH: 'payment_received',
    PAYMENT_OVERDUE: 'payment_overdue',
    PAYMENT_DELETED: 'payment_cancelled',
    PAYMENT_RESTORED: 'payment_confirmed',
    PAYMENT_REFUNDED: 'payment_refunded',
    PAYMENT_REFUND_IN_PROGRESS: 'payment_refunded',
    PAYMENT_CHARGEBACK_REQUESTED: 'payment_failed',
    PAYMENT_CHARGEBACK_DISPUTE: 'payment_failed',
    PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'payment_failed',
    PAYMENT_DUNNING_RECEIVED: 'payment_received',
    PAYMENT_DUNNING_REQUESTED: 'payment_overdue',
    PAYMENT_BANK_SLIP_VIEWED: 'payment_confirmed',
    PAYMENT_CHECKOUT_VIEWED: 'payment_confirmed',
  }
  return map[event] ?? null
}

/**
 * Normalize an Asaas webhook payload into the canonical NormalizedWebhookEvent.
 * Returns null for events we don't care about (e.g. PAYMENT_CREATED).
 */
export function normalizeAsaasWebhook(raw: AsaasWebhookEvent): NormalizedWebhookEvent | null {
  const eventType = toCanonicalEventType(raw.event)
  if (!eventType) return null

  return {
    connector_id: 'asaas',
    provider_id: raw.payment.id,
    event_type: eventType,
    amount: asaasToCents(raw.payment.value),
    paid_at:
      raw.payment.status === 'RECEIVED' || raw.payment.status === 'CONFIRMED'
        ? raw.payment.confirmedDate ?? raw.payment.paymentDate ?? new Date().toISOString()
        : undefined,
    raw: raw as unknown as Record<string, unknown>,
  }
}
