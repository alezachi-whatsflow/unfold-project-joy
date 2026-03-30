// ─────────────────────────────────────────────────────────────
// Asaas-specific types — mirrors the Asaas REST API
// ─────────────────────────────────────────────────────────────

/** Asaas billing types */
export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD' | 'UNDEFINED'

/** Asaas charge statuses */
export type AsaasChargeStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED'
  | 'REFUND_IN_PROGRESS'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS'

/** Credit card data for tokenization */
export interface AsaasCreditCard {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

/** Credit card holder info */
export interface AsaasCreditCardHolder {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

/** Request to create a charge */
export interface AsaasChargeRequest {
  customer: string
  billingType: AsaasBillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  creditCard?: AsaasCreditCard
  creditCardHolderInfo?: AsaasCreditCardHolder
  creditCardToken?: string
  installmentCount?: number
  installmentValue?: number
  discount?: {
    value: number
    dueDateLimitDays: number
    type: 'FIXED' | 'PERCENTAGE'
  }
  fine?: { value: number; type: 'FIXED' | 'PERCENTAGE' }
  interest?: { value: number }
  postalService?: boolean
  split?: AsaasSplitItem[]
}

/** Split item for a charge */
export interface AsaasSplitItem {
  walletId: string
  fixedValue?: number
  percentualValue?: number
}

/** Response from charge creation / status query */
export interface AsaasChargeResponse {
  id: string
  dateCreated: string
  customer: string
  value: number
  netValue: number
  billingType: AsaasBillingType
  status: AsaasChargeStatus
  dueDate: string
  paymentDate?: string
  confirmedDate?: string
  description?: string
  externalReference?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  pixTransaction?: {
    qrCodeImage?: string
    payload?: string
    expirationDate?: string
  }
  creditCard?: {
    creditCardNumber?: string
    creditCardBrand?: string
    creditCardToken?: string
  }
  transactionReceiptUrl?: string
  nossoNumero?: string
  deleted: boolean
}

/** Request to create a customer */
export interface AsaasCustomerRequest {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
  notificationDisabled?: boolean
}

/** Response from customer creation / query */
export interface AsaasCustomerResponse {
  id: string
  dateCreated: string
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
  notificationDisabled: boolean
  deleted: boolean
}

/** Tokenize card response */
export interface AsaasTokenizeResponse {
  creditCardNumber: string
  creditCardBrand: string
  creditCardToken: string
}

/** Receivable schedule item from /financialTransactions */
export interface AsaasReceivableSchedule {
  id: string
  value: number
  netValue: number
  status: string
  paymentDate?: string
  estimatedCreditDate?: string
  type: string
  description?: string
}

/** Webhook event payload from Asaas */
export interface AsaasWebhookEvent {
  event: string
  payment: {
    id: string
    customer: string
    billingType: AsaasBillingType
    value: number
    netValue?: number
    status: AsaasChargeStatus | string
    dueDate: string
    paymentDate?: string
    confirmedDate?: string
    description?: string
    externalReference?: string
    invoiceUrl?: string
    bankSlipUrl?: string
  }
}
