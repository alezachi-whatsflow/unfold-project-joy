import type {
  IConnector,
  ConnectorId,
  CreateChargePayload,
  ChargeResult,
  RefundResult,
  NormalizedWebhookEvent,
  SettlementScheduleItem,
  Money,
} from '../../types'
import { asaasRequest, AsaasApiError } from './client'
import type {
  AsaasChargeResponse,
  AsaasCustomerRequest,
  AsaasCustomerResponse,
  AsaasTokenizeResponse,
  AsaasReceivableSchedule,
  AsaasWebhookEvent,
} from './types'
import {
  centsToAsaas,
  toAsaasChargeRequest,
  fromAsaasChargeResponse,
  fromAsaasSchedule,
} from './mappers'
import { normalizeAsaasWebhook, verifyAsaasWebhook } from './webhook'

// ─────────────────────────────────────────────────────────────
// AsaasConnector — implements IConnector
// ─────────────────────────────────────────────────────────────

class AsaasConnector implements IConnector {
  readonly id: ConnectorId = 'asaas'

  // ── IConnector.createCharge ────────────────────────────────
  async createCharge(payload: CreateChargePayload): Promise<ChargeResult> {
    // Ensure customer exists in Asaas
    const customerId = await this.ensureCustomer(payload.customer)
    const body = toAsaasChargeRequest(payload, customerId)

    const res = await asaasRequest<AsaasChargeResponse>({
      method: 'POST',
      path: '/payments',
      body: body as unknown as Record<string, unknown>,
    })

    // If PIX, fetch the QR code (Asaas returns it on a separate endpoint)
    if (payload.method === 'pix' && res.id) {
      try {
        const pix = await asaasRequest<{ encodedImage: string; payload: string; expirationDate: string }>({
          method: 'GET',
          path: `/payments/${res.id}/pixQrCode`,
        })
        res.pixTransaction = {
          qrCodeImage: pix.encodedImage,
          payload: pix.payload,
          expirationDate: pix.expirationDate,
        }
      } catch {
        // PIX QR may not be immediately available; charge was still created
      }
    }

    return fromAsaasChargeResponse(res)
  }

  // ── IConnector.refund ──────────────────────────────────────
  async refund(providerId: string, amount?: Money): Promise<RefundResult> {
    const body: Record<string, unknown> = {}
    if (amount !== undefined) body.value = centsToAsaas(amount)

    const res = await asaasRequest<AsaasChargeResponse>({
      method: 'POST',
      path: `/payments/${providerId}/refund`,
      body: Object.keys(body).length > 0 ? body : undefined,
    })

    return {
      provider_id: res.id,
      status: res.status === 'REFUNDED' ? 'refunded' : 'pending',
      refunded_amount: amount ?? Math.round((res.value ?? 0) * 100),
      raw: res as unknown as Record<string, unknown>,
    }
  }

  // ── IConnector.normalizeWebhook ────────────────────────────
  normalizeWebhook(payload: unknown): NormalizedWebhookEvent {
    const event = normalizeAsaasWebhook(payload as AsaasWebhookEvent)
    if (!event) {
      throw new Error('[asaas] Unhandled webhook event')
    }
    return event
  }

  // ── IConnector.healthCheck ─────────────────────────────────
  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      await asaasRequest<{ object: string }>({
        method: 'GET',
        path: '/finance/getCurrentBalance',
      })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  }

  // ── IConnector.getSettlementSchedule ───────────────────────
  async getSettlementSchedule(
    startDate: string,
    endDate: string,
  ): Promise<SettlementScheduleItem[]> {
    const res = await asaasRequest<{ data: AsaasReceivableSchedule[] }>({
      method: 'GET',
      path: `/financialTransactions?startDate=${startDate}&finishDate=${endDate}&limit=100`,
    })
    return (res.data ?? []).map(fromAsaasSchedule)
  }

  // ── Extra: captureCharge ───────────────────────────────────
  async captureCharge(providerId: string): Promise<ChargeResult> {
    const res = await asaasRequest<AsaasChargeResponse>({
      method: 'POST',
      path: `/payments/${providerId}/capture`,
    })
    return fromAsaasChargeResponse(res)
  }

  // ── Extra: cancelCharge ────────────────────────────────────
  async cancelCharge(providerId: string): Promise<{ provider_id: string; status: string }> {
    const res = await asaasRequest<AsaasChargeResponse>({
      method: 'DELETE',
      path: `/payments/${providerId}`,
    })
    return { provider_id: res.id, status: 'cancelled' }
  }

  // ── Extra: tokenizeCard ────────────────────────────────────
  async tokenizeCard(
    customerId: string,
    card: { holder_name: string; number: string; expiry_month: string; expiry_year: string; cvv: string },
  ): Promise<AsaasTokenizeResponse> {
    return asaasRequest<AsaasTokenizeResponse>({
      method: 'POST',
      path: '/creditCard/tokenize',
      body: {
        customer: customerId,
        creditCard: {
          holderName: card.holder_name,
          number: card.number,
          expiryMonth: card.expiry_month,
          expiryYear: card.expiry_year,
          ccv: card.cvv,
        },
      },
    })
  }

  // ── Extra: getChargeStatus ─────────────────────────────────
  async getChargeStatus(providerId: string): Promise<ChargeResult> {
    const res = await asaasRequest<AsaasChargeResponse>({
      method: 'GET',
      path: `/payments/${providerId}`,
    })
    return fromAsaasChargeResponse(res)
  }

  // ── Extra: generateSplit ───────────────────────────────────
  async generateSplit(
    providerId: string,
    splits: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>,
  ): Promise<{ provider_id: string; splits: typeof splits }> {
    // Asaas splits are set at charge creation time; this endpoint updates them
    await asaasRequest<AsaasChargeResponse>({
      method: 'PUT',
      path: `/payments/${providerId}`,
      body: { split: splits },
    })
    return { provider_id: providerId, splits }
  }

  // ── Extra: executePayout ───────────────────────────────────
  async executePayout(
    amount: Money,
    bankAccount: { bank: string; accountName: string; agency: string; account: string; accountDigit: string; cpfCnpj: string },
  ): Promise<{ id: string; status: string }> {
    const res = await asaasRequest<{ id: string; status: string }>({
      method: 'POST',
      path: '/transfers',
      body: {
        value: centsToAsaas(amount),
        bankAccount,
      },
    })
    return { id: res.id, status: res.status }
  }

  // ── Extra: verifyWebhookToken ──────────────────────────────
  verifyWebhookToken(token: string, expectedToken: string): boolean {
    return verifyAsaasWebhook(token, expectedToken)
  }

  // ── Private: ensureCustomer ────────────────────────────────
  private async ensureCustomer(
    customer: CreateChargePayload['customer'],
  ): Promise<string> {
    // Try to find existing customer by CPF/CNPJ
    try {
      const existing = await asaasRequest<{ data: AsaasCustomerResponse[] }>({
        method: 'GET',
        path: `/customers?cpfCnpj=${customer.document}`,
      })
      if (existing.data?.length > 0) return existing.data[0].id
    } catch {
      // Not found, create new
    }

    const body: AsaasCustomerRequest = {
      name: customer.name,
      cpfCnpj: customer.document,
      email: customer.email,
      mobilePhone: customer.phone,
      notificationDisabled: true,
    }

    const created = await asaasRequest<AsaasCustomerResponse>({
      method: 'POST',
      path: '/customers',
      body: body as unknown as Record<string, unknown>,
    })

    return created.id
  }
}

export const asaasConnector = new AsaasConnector()
export { AsaasConnector }
