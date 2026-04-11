// ─────────────────────────────────────────────────────────────
// Pzaafi — Split Module (Module D) — Re-exports
// ─────────────────────────────────────────────────────────────

// Services
export { validateSplitReceivers, calculateSplitAmounts } from './services/splitValidator'
export type { SplitAmount, ValidationResult } from './services/splitValidator'

export { executeSplit, getSplitsByPayment } from './services/splitService'
export type { SplitExecution, ExecuteSplitParams, ExecuteSplitResult } from './services/splitService'

export { schedulePayout, executePayout } from './services/payoutService'
export type { Payout, SchedulePayoutParams, PayoutResult } from './services/payoutService'

// Hooks
export { usePzaafiSplit } from './hooks/usePzaafiSplit'
export type { SplitRule } from './hooks/usePzaafiSplit'

export { usePzaafiPayout } from './hooks/usePzaafiPayout'
