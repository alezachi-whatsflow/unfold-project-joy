// ─────────────────────────────────────────────────────────────
// Pzaafi — Split Validator (Module D)
// Validates split rules and calculates amounts per receiver
// ─────────────────────────────────────────────────────────────

import type { Money, SplitReceiver } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface SplitAmount {
  wallet_id: string
  amount_cents: Money
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// ── Validate receivers ──────────────────────────────────────

export function validateSplitReceivers(receivers: SplitReceiver[]): ValidationResult {
  const errors: string[] = []

  if (!receivers || receivers.length === 0) {
    errors.push('At least one receiver is required')
    return { valid: false, errors }
  }

  // Check for duplicate wallet IDs
  const walletIds = receivers.map((r) => r.wallet_id)
  const uniqueIds = new Set(walletIds)
  if (uniqueIds.size !== walletIds.length) {
    errors.push('Duplicate wallet_id found in receivers')
  }

  // Check that each receiver has percent OR fixed (not both, not neither)
  for (let i = 0; i < receivers.length; i++) {
    const r = receivers[i]
    if (!r.wallet_id) {
      errors.push(`Receiver ${i}: wallet_id is required`)
    }
    const hasPercent = r.percent !== undefined && r.percent !== null
    const hasFixed = r.fixed !== undefined && r.fixed !== null
    if (!hasPercent && !hasFixed) {
      errors.push(`Receiver ${i}: must have either percent or fixed amount`)
    }
    if (hasPercent && hasFixed) {
      errors.push(`Receiver ${i}: cannot have both percent and fixed amount`)
    }
    if (hasPercent && (r.percent! <= 0 || r.percent! > 100)) {
      errors.push(`Receiver ${i}: percent must be between 0 and 100`)
    }
    if (hasFixed && r.fixed! <= 0) {
      errors.push(`Receiver ${i}: fixed amount must be positive`)
    }
  }

  // Check that total percent does not exceed 100
  const totalPercent = receivers
    .filter((r) => r.percent !== undefined && r.percent !== null)
    .reduce((sum, r) => sum + (r.percent ?? 0), 0)

  if (totalPercent > 100) {
    errors.push(`Total percent (${totalPercent}%) exceeds 100%`)
  }

  return { valid: errors.length === 0, errors }
}

// ── Calculate split amounts ─────────────────────────────────

/**
 * Calculates split amounts for each receiver.
 * Handles both percent-based and fixed-based splits.
 * Distributes residual cent(s) to the last receiver to ensure exact totals.
 */
export function calculateSplitAmounts(
  receivers: SplitReceiver[],
  totalCents: Money,
): SplitAmount[] {
  const amounts: SplitAmount[] = []

  // 1. First pass: calculate fixed amounts
  let remainingAfterFixed = totalCents
  const fixedReceivers: SplitAmount[] = []
  const percentReceivers: Array<{ wallet_id: string; percent: number }> = []

  for (const r of receivers) {
    if (r.fixed !== undefined && r.fixed !== null) {
      const fixedAmount = Math.min(r.fixed, remainingAfterFixed)
      fixedReceivers.push({ wallet_id: r.wallet_id, amount_cents: fixedAmount })
      remainingAfterFixed -= fixedAmount
    } else if (r.percent !== undefined && r.percent !== null) {
      percentReceivers.push({ wallet_id: r.wallet_id, percent: r.percent })
    }
  }

  // 2. Second pass: distribute remaining by percent
  let distributedCents = 0
  const percentAmounts: SplitAmount[] = []

  for (let i = 0; i < percentReceivers.length; i++) {
    const r = percentReceivers[i]
    const raw = (remainingAfterFixed * r.percent) / 100
    const rounded = Math.floor(raw) // Always floor, distribute residual later
    percentAmounts.push({ wallet_id: r.wallet_id, amount_cents: rounded })
    distributedCents += rounded
  }

  // 3. Distribute residual cent(s) to the last percent receiver
  const residual = remainingAfterFixed - distributedCents
  if (residual > 0 && percentAmounts.length > 0) {
    percentAmounts[percentAmounts.length - 1].amount_cents += residual
  }

  // 4. Combine: fixed first, then percent
  amounts.push(...fixedReceivers, ...percentAmounts)

  return amounts
}
