// ─────────────────────────────────────────────────────────────
// Pzaafi — Payment Orchestration Types
// ─────────────────────────────────────────────────────────────

// ── Value Objects ──────────────────────────────────────────

/** Monetary value in BRL cents (integer) */
export type Money = number

/** Tier determines feature set and dashboard */
export type PzaafiTier = 'nexus' | 'whitelabel' | 'cliente'

/** Supported payment connector identifiers */
export type ConnectorId = 'asaas' | 'pjbank' | 'getnet'

/** Payment methods accepted */
export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'debit_card'

/** Payment lifecycle status */
export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'overdue'
  | 'refunded'
  | 'cancelled'
  | 'failed'

/** Order lifecycle status */
export type OrderStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'cancelled'

/** Wallet balance types */
export type BalanceType = 'available' | 'pending' | 'blocked'

/** Ledger double-entry event types */
export type LedgerEventType =
  | 'charge_received'
  | 'split_out'
  | 'split_in'
  | 'refund'
  | 'withdrawal'
  | 'fee'
  | 'adjustment'

// ── Interfaces ─────────────────────────────────────────────

/** Organization registered in Pzaafi */
export interface PzaafiOrganization {
  id: string
  tenant_id: string
  name: string
  document: string // CPF or CNPJ
  pzaafi_tier: PzaafiTier
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Wallet holds balances for an organization */
export interface PzaafiWallet {
  id: string
  organization_id: string
  available: Money
  pending: Money
  blocked: Money
  currency: 'BRL'
  updated_at: string
}

/** Provider connection credentials (encrypted at rest) */
export interface PzaafiProviderConnection {
  id: string
  organization_id: string
  connector_id: ConnectorId
  is_active: boolean
  is_sandbox: boolean
  credentials_encrypted: string
  webhook_url: string
  created_at: string
  updated_at: string
}

/** Order — aggregates one or more payments */
export interface PzaafiOrder {
  id: string
  organization_id: string
  external_id?: string
  status: OrderStatus
  total: Money
  paid: Money
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Individual payment attempt */
export interface PzaafiPayment {
  id: string
  order_id: string
  organization_id: string
  connector_id: ConnectorId
  method: PaymentMethod
  status: PaymentStatus
  amount: Money
  fee: Money
  net: Money
  provider_id?: string
  pix_qr_code?: string
  pix_copy_paste?: string
  boleto_url?: string
  boleto_barcode?: string
  due_date?: string
  paid_at?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Immutable ledger entry (double-entry bookkeeping) */
export interface PzaafiLedgerEntry {
  id: string
  wallet_id: string
  organization_id: string
  event_type: LedgerEventType
  debit: Money
  credit: Money
  balance_after: Money
  reference_type: string
  reference_id: string
  description: string
  created_at: string
}

/** Single receiver in a split rule */
export interface SplitReceiver {
  wallet_id: string
  percent?: number
  fixed?: Money
}

/** Split rule — how a payment is divided */
export interface PzaafiSplitRule {
  id: string
  organization_id: string
  name: string
  receivers: SplitReceiver[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Connector Contract ─────────────────────────────────────

/** Credit/debit card data for tokenization */
export interface CardData {
  holder_name: string
  number: string
  expiry_month: string
  expiry_year: string
  cvv: string
}

/** Payload to create a charge via any connector */
export interface CreateChargePayload {
  amount: Money
  method: PaymentMethod
  customer: {
    name: string
    document: string
    email?: string
    phone?: string
  }
  due_date?: string
  description?: string
  card?: CardData
  metadata?: Record<string, unknown>
}

/** Result returned after creating a charge */
export interface ChargeResult {
  provider_id: string
  status: PaymentStatus
  pix_qr_code?: string
  pix_copy_paste?: string
  boleto_url?: string
  boleto_barcode?: string
  raw?: Record<string, unknown>
}

/** Result returned after a refund */
export interface RefundResult {
  provider_id: string
  status: 'refunded' | 'pending' | 'failed'
  refunded_amount: Money
  raw?: Record<string, unknown>
}

/** Normalized webhook event from any connector */
export interface NormalizedWebhookEvent {
  connector_id: ConnectorId
  provider_id: string
  event_type: 'payment_confirmed' | 'payment_received' | 'payment_overdue' | 'payment_refunded' | 'payment_cancelled' | 'payment_failed'
  amount: Money
  paid_at?: string
  raw: Record<string, unknown>
}

/** Settlement schedule item */
export interface SettlementScheduleItem {
  date: string
  amount: Money
  status: 'scheduled' | 'settled' | 'failed'
}

/** Canonical connector interface — all connectors must implement */
export interface IConnector {
  readonly id: ConnectorId

  /** Create a charge (pix, boleto, or card) */
  createCharge(payload: CreateChargePayload): Promise<ChargeResult>

  /** Refund a charge by provider ID */
  refund(providerId: string, amount?: Money): Promise<RefundResult>

  /** Normalize an incoming webhook payload */
  normalizeWebhook(payload: unknown): NormalizedWebhookEvent

  /** Check connector health / credentials validity */
  healthCheck(): Promise<{ ok: boolean; message?: string }>

  /** Get settlement schedule */
  getSettlementSchedule?(startDate: string, endDate: string): Promise<SettlementScheduleItem[]>
}
