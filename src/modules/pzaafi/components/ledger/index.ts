// ─────────────────────────────────────────────────────────────
// Pzaafi — Ledger Module (Module C) — Re-exports
// ─────────────────────────────────────────────────────────────

// Services
export {
  writeLedgerEntry,
  onPaymentConfirmed,
  onSettlementExecuted,
  onRefundCreated,
  onChargebackOpened,
} from './services/ledgerService'
export type { WriteLedgerEntryParams } from './services/ledgerService'

export {
  getWallet,
  getWalletSummary,
  ensureWallet,
} from './services/walletService'
export type { WalletAccount, WalletSummary } from './services/walletService'

export { getSettlementSchedule } from './services/settlementService'
export type { Settlement, SettlementSchedule } from './services/settlementService'

export { emitFiscalDocument } from './services/fiscalService'
export type { FiscalDocument, EmitFiscalDocumentParams, EmitFiscalResult } from './services/fiscalService'

// Hooks
export { usePzaafiLedger } from './hooks/usePzaafiLedger'
export type { LedgerEntry } from './hooks/usePzaafiLedger'

export { usePzaafiWallet } from './hooks/usePzaafiWallet'
