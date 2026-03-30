import type { ConnectorId } from '../../types'

const CONNECTOR_ID: ConnectorId = 'asaas'
const TIMEOUT_MS = 10_000
const MAX_RETRIES = 3

let circuitOpen = false
let failureCount = 0
let lastFailureAt = 0
const FAILURE_THRESHOLD = 5
const CIRCUIT_RESET_MS = 60_000

export class AsaasApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message)
    this.name = 'AsaasApiError'
  }
}

interface RequestOpts {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: Record<string, unknown>
  apiKey?: string
}

export async function asaasRequest<T>(opts: RequestOpts): Promise<T> {
  const baseUrl =
    typeof process !== 'undefined'
      ? (process.env?.ASAAS_API_URL ?? 'https://api.asaas.com/v3')
      : 'https://api.asaas.com/v3'

  if (circuitOpen) {
    if (Date.now() - lastFailureAt > CIRCUIT_RESET_MS) {
      circuitOpen = false
      failureCount = 0
    } else {
      throw new Error(`[${CONNECTOR_ID}] Circuit open`)
    }
  }

  const apiKey =
    opts.apiKey ??
    (typeof process !== 'undefined' ? process.env?.ASAAS_API_KEY : undefined)
  if (!apiKey) throw new Error(`[${CONNECTOR_ID}] Missing ASAAS_API_KEY`)

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${baseUrl}${opts.path}`, {
        method: opts.method,
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Whatsflow-Pzaafi/1.0',
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        if (res.status >= 400 && res.status < 500) {
          throw new AsaasApiError(res.status, err.message ?? 'API error', err)
        }
        throw new Error(`[${CONNECTOR_ID}] HTTP ${res.status}`)
      }

      failureCount = 0
      return (await res.json()) as T
    } catch (e) {
      clearTimeout(timer)
      lastError = e instanceof Error ? e : new Error(String(e))
      if (e instanceof AsaasApiError) throw e
      failureCount++
      lastFailureAt = Date.now()
      if (failureCount >= FAILURE_THRESHOLD) circuitOpen = true
      if (attempt < MAX_RETRIES)
        await new Promise((r) => setTimeout(r, attempt * 1000))
    }
  }

  throw lastError ?? new Error(`[${CONNECTOR_ID}] Max retries`)
}
