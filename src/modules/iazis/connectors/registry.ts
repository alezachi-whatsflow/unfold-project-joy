import type { IConnector, ConnectorId } from '../types'
import { asaasConnector } from './asaas'

const registry = new Map<ConnectorId, IConnector>([
  ['asaas', asaasConnector],
])

export function getConnector(id: ConnectorId): IConnector {
  const c = registry.get(id)
  if (!c) throw new Error(`[ConnectorRegistry] Unknown connector: ${id}`)
  return c
}

export function getActiveConnectors(): IConnector[] {
  return Array.from(registry.values())
}

export function listConnectorIds(): ConnectorId[] {
  return Array.from(registry.keys())
}
