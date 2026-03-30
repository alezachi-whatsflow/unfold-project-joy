// IConnector — canonical contract
// All connectors implement this interface
// No code outside connectors/ can import a connector directly
export type { IConnector, CreateChargePayload, ChargeResult, RefundResult, NormalizedWebhookEvent, SettlementScheduleItem, CardData } from '../types'
