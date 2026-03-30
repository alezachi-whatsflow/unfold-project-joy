// ─────────────────────────────────────────────────────────────
// Pzaafi — React Hook: usePzaafiOrchestration
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react'
import type { OrchestrationRequest, OrchestrationResult, ConnectorHealthState } from '../types'
import { orchestratePayment, syncConnectorHealth } from '../services/orchestrationService'

interface UsePzaafiOrchestrationOptions {
  organizationId: string
  /** Health sync interval in ms (default: 60_000) */
  healthSyncInterval?: number
  /** Auto-sync health on mount (default: true) */
  autoSync?: boolean
}

interface UsePzaafiOrchestrationReturn {
  /** Execute a payment orchestration */
  orchestrate: (request: OrchestrationRequest) => Promise<OrchestrationResult>
  /** Last orchestration result */
  lastResult: OrchestrationResult | null
  /** Whether an orchestration is in progress */
  isProcessing: boolean
  /** Last error message */
  error: string | null
  /** Cached connector health states */
  healthStates: ConnectorHealthState[]
  /** Manually refresh connector health */
  refreshHealth: () => Promise<void>
}

export function usePzaafiOrchestration(
  options: UsePzaafiOrchestrationOptions,
): UsePzaafiOrchestrationReturn {
  const { organizationId, healthSyncInterval = 60_000, autoSync = true } = options

  const [lastResult, setLastResult] = useState<OrchestrationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStates, setHealthStates] = useState<ConnectorHealthState[]>([])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Health sync ──────────────────────────────────────────

  const refreshHealth = useCallback(async () => {
    try {
      const states = await syncConnectorHealth(organizationId)
      setHealthStates(states)
    } catch (err) {
      console.error('[usePzaafiOrchestration] Health sync failed:', err)
    }
  }, [organizationId])

  useEffect(() => {
    if (!autoSync) return

    // Initial sync
    refreshHealth()

    // Periodic sync
    intervalRef.current = setInterval(refreshHealth, healthSyncInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoSync, healthSyncInterval, refreshHealth])

  // ── Orchestrate ──────────────────────────────────────────

  const orchestrate = useCallback(
    async (request: OrchestrationRequest): Promise<OrchestrationResult> => {
      setIsProcessing(true)
      setError(null)

      try {
        const result = await orchestratePayment(request)
        setLastResult(result)

        if (!result.success) {
          setError(`Payment failed after ${result.attempts.length} attempt(s)`)
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Orchestration failed'
        setError(message)
        throw err
      } finally {
        setIsProcessing(false)
      }
    },
    [],
  )

  return {
    orchestrate,
    lastResult,
    isProcessing,
    error,
    healthStates,
    refreshHealth,
  }
}
