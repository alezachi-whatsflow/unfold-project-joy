import type { PaymentMethod, PaymentStatus, Money, ChargeResult, SettlementScheduleItem, CreateChargePayload } from '../../types'
import type { AsaasChargeStatus, AsaasBillingType, AsaasChargeResponse, AsaasChargeRequest, AsaasReceivableSchedule } from './types'

// ── Money conversion ─────────────────────────────────────────

/** Convert BRL cents (integer) to Asaas float (e.g. 1990 -> 19.90) */
export function centsToAsaas(cents: Money): number {
  return Math.round(cents) / 100
}

/** Convert Asaas float to BRL cents (e.g. 19.90 -> 1990) */
export function asaasToCents(value: number): Money {
  return Math.round(value * 100)
}

// ── Status mapping ───────────────────────────────────────────

const STATUS_MAP: Record<AsaasChargeStatus, PaymentStatus> = {
  PENDING: 'pending',
  RECEIVED: 'received',
  CONFIRMED: 'confirmed',
  OVERDUE: 'overdue',
  REFUNDED: 'refunded',
  RECEIVED_IN_CASH: 'received',
  REFUND_REQUESTED: 'pending',
  REFUND_IN_PROGRESS: 'pending',
  CHARGEBACK_REQUESTED: 'failed',
  CHARGEBACK_DISPUTE: 'failed',
  AWAITING_CHARGEBACK_REVERSAL: 'failed',
  DUNNING_REQUESTED: 'overdue',
  DUNNING_RECEIVED: 'received',
  AWAITING_RISK_ANALYSIS: 'pending',
}

export function mapAsaasStatus(status: AsaasChargeStatus): PaymentStatus {
  return STATUS_MAP[status] ?? 'pending'
}

// ── Method mapping ───────────────────────────────────────────

const METHOD_TO_ASAAS: Record<PaymentMethod, AsaasBillingType> = {
  pix: 'PIX',
  boleto: 'BOLETO',
  credit_card: 'CREDIT_CARD',
  debit_card: 'DEBIT_CARD',
}

const ASAAS_TO_METHOD: Record<AsaasBillingType, PaymentMethod> = {
  PIX: 'pix',
  BOLETO: 'boleto',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  UNDEFINED: 'pix',
}

export function mapMethodToAsaas(method: PaymentMethod): AsaasBillingType {
  return METHOD_TO_ASAAS[method] ?? 'PIX'
}

export function mapMethodFromAsaas(billing: AsaasBillingType): PaymentMethod {
  return ASAAS_TO_METHOD[billing] ?? 'pix'
}

// ── Payload builders ─────────────────────────────────────────

/** Build Asaas charge request from canonical payload (customer ID must be resolved beforehand) */
export function toAsaasChargeRequest(
  payload: CreateChargePayload,
  customerId: string,
): AsaasChargeRequest {
  const req: AsaasChargeRequest = {
    customer: customerId,
    billingType: mapMethodToAsaas(payload.method),
    value: centsToAsaas(payload.amount),
    dueDate: payload.due_date ?? new Date().toISOString().slice(0, 10),
    description: payload.description,
    externalReference: payload.metadata?.external_id as string | undefined,
  }

  if (payload.card && payload.method === 'credit_card') {
    req.creditCard = {
      holderName: payload.card.holder_name,
      number: payload.card.number,
      expiryMonth: payload.card.expiry_month,
      expiryYear: payload.card.expiry_year,
      ccv: payload.card.cvv,
    }
    req.creditCardHolderInfo = {
      name: payload.customer.name,
      email: payload.customer.email ?? '',
      cpfCnpj: payload.customer.document,
      postalCode: '',
      addressNumber: '',
      phone: payload.customer.phone ?? '',
    }
  }

  return req
}

// ── Response mappers ─────────────────────────────────────────

export function fromAsaasChargeResponse(res: AsaasChargeResponse): ChargeResult {
  return {
    provider_id: res.id,
    status: mapAsaasStatus(res.status),
    pix_qr_code: res.pixTransaction?.qrCodeImage,
    pix_copy_paste: res.pixTransaction?.payload,
    boleto_url: res.bankSlipUrl ?? res.invoiceUrl,
    boleto_barcode: res.nossoNumero,
    raw: res as unknown as Record<string, unknown>,
  }
}

export function fromAsaasSchedule(item: AsaasReceivableSchedule): SettlementScheduleItem {
  return {
    date: item.estimatedCreditDate ?? item.paymentDate ?? '',
    amount: asaasToCents(item.netValue),
    status:
      item.status === 'CONFIRMED' || item.status === 'RECEIVED'
        ? 'settled'
        : item.status === 'PENDING'
          ? 'scheduled'
          : 'failed',
  }
}
