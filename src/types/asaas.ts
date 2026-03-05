// ============================================================
// Asaas Integration Types
// ============================================================

export type AsaasEnvironment = "sandbox" | "production";
export type BillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
export type PaymentStatus =
  | "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE"
  | "REFUNDED" | "RECEIVED_IN_CASH" | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS" | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE" | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED" | "DUNNING_RECEIVED" | "AWAITING_RISK_ANALYSIS";

export type DunningStatus = "draft" | "active" | "paused" | "completed";

export interface Tenant {
  id: string;
  name: string;
  document: string | null;
  created_at: string;
}

export interface AsaasConnection {
  id: string;
  tenant_id: string;
  environment: AsaasEnvironment;
  api_key_hint: string | null;
  webhook_token: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AsaasCustomer {
  id: string;
  tenant_id: string;
  asaas_id: string;
  name: string;
  email: string | null;
  cpf_cnpj: string | null;
  phone: string | null;
  mobile_phone: string | null;
  external_reference: string | null;
  synced_at: string;
}

export interface CheckoutSource {
  id: string;
  tenant_id: string;
  name: string;
  billing_type: BillingType;
  description: string | null;
  is_active: boolean;
}

export interface SalesPerson {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  asaas_wallet_id: string | null;
  commission_percent: number;
  is_active: boolean;
}

export interface AsaasPayment {
  id: string;
  tenant_id: string;
  asaas_id: string;
  asaas_customer_id: string | null;
  customer_id: string | null;
  checkout_source_id: string | null;
  salesperson_id: string | null;
  billing_type: BillingType;
  status: PaymentStatus;
  value: number;
  net_value: number | null;
  due_date: string;
  payment_date: string | null;
  confirmed_date: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  description: string | null;
  external_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsaasSplit {
  id: string;
  tenant_id: string;
  payment_id: string;
  salesperson_id: string | null;
  wallet_id: string;
  fixed_value: number | null;
  percent_value: number | null;
  total_value: number | null;
  status: string;
}

export interface DunningRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: DunningStatus;
  rules: DunningStep[];
  version: number;
  created_at: string;
}

export interface DunningStep {
  days_after_due: number;
  action: "notification" | "sms" | "email" | "protest";
  message: string;
}

export interface DunningExecution {
  id: string;
  dunning_rule_id: string;
  payment_id: string;
  step_index: number;
  action: string;
  executed_at: string;
  success: boolean;
}

export interface WebhookEvent {
  id: string;
  tenant_id: string | null;
  event_type: string;
  asaas_event_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  received_at: string;
}

// Asaas API response types
export interface AsaasListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

export interface AsaasApiCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  mobilePhone: string;
  externalReference: string;
  [key: string]: unknown;
}

export interface AsaasApiPayment {
  id: string;
  customer: string;
  billingType: BillingType;
  status: PaymentStatus;
  value: number;
  netValue: number;
  dueDate: string;
  paymentDate: string | null;
  confirmedDate: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  description: string | null;
  externalReference: string | null;
  [key: string]: unknown;
}

// Payment status labels and colors
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: "default" | "destructive" | "secondary" | "outline" }> = {
  PENDING: { label: "Pendente", color: "secondary" },
  RECEIVED: { label: "Recebido", color: "default" },
  CONFIRMED: { label: "Confirmado", color: "default" },
  OVERDUE: { label: "Vencido", color: "destructive" },
  REFUNDED: { label: "Estornado", color: "outline" },
  RECEIVED_IN_CASH: { label: "Recebido em Dinheiro", color: "default" },
  REFUND_REQUESTED: { label: "Estorno Solicitado", color: "secondary" },
  REFUND_IN_PROGRESS: { label: "Estorno em Andamento", color: "secondary" },
  CHARGEBACK_REQUESTED: { label: "Chargeback Solicitado", color: "destructive" },
  CHARGEBACK_DISPUTE: { label: "Chargeback em Disputa", color: "destructive" },
  AWAITING_CHARGEBACK_REVERSAL: { label: "Aguardando Reversão", color: "secondary" },
  DUNNING_REQUESTED: { label: "Negativação Solicitada", color: "destructive" },
  DUNNING_RECEIVED: { label: "Negativação Recebida", color: "destructive" },
  AWAITING_RISK_ANALYSIS: { label: "Análise de Risco", color: "secondary" },
};

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão de Crédito",
  PIX: "Pix",
  UNDEFINED: "Indefinido",
};
