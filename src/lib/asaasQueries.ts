import { supabase } from "@/integrations/supabase/client";
import type {
  AsaasPayment,
  AsaasCustomer,
  DunningRule,
  CheckoutSource,
  SalesPerson,
  WebhookEvent,
  DunningExecution,
} from "@/types/asaas";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SUPABASE_URL = "https://knnwgijcrpbgqhdzmdrp.supabase.co";

// ── Asaas Proxy Calls ──

export async function callAsaasProxy(params: {
  endpoint: string;
  method?: string;
  params?: Record<string, unknown>;
  environment?: "sandbox" | "production";
  limit?: number;
  offset?: number;
}) {
  let data: any = null;
  let error: any = null;

  try {
    const result = await supabase.functions.invoke("asaas-proxy", {
      body: params,
    });
    data = result.data;
    error = result.error;
  } catch (invokeError: any) {
    throw new Error(invokeError?.message || "Erro de conexão com o servidor");
  }

  if (error) {
    // Try to extract a meaningful message from the error
    let message = "Asaas proxy error";
    if (typeof error === "string") {
      message = error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.context) {
      try {
        const ctx = typeof error.context === "string" ? JSON.parse(error.context) : error.context;
        message = ctx?.error || ctx?.message || JSON.stringify(ctx);
      } catch {
        message = String(error);
      }
    }
    throw new Error(message);
  }

  if (data && data.error) {
    const details = data.details
      ? `: ${typeof data.details === "string" ? data.details : JSON.stringify(data.details)}`
      : "";
    throw new Error(data.error + details);
  }

  return data;
}

// Fetch all pages from Asaas API
export async function fetchAllFromAsaas(
  endpoint: string,
  environment: "sandbox" | "production" = "sandbox"
) {
  const allData: unknown[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await callAsaasProxy({
      endpoint,
      method: "GET",
      environment,
      limit,
      offset,
    });

    if (response.data && Array.isArray(response.data)) {
      allData.push(...response.data);
      hasMore = response.hasMore === true;
      offset += limit;
    } else {
      hasMore = false;
    }

    // Small delay between pages
    if (hasMore) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return allData;
}

// ── Sync Functions ──

export async function syncCustomersFromAsaas(
  environment: "sandbox" | "production" = "sandbox"
) {
  const customers = await fetchAllFromAsaas("/customers", environment);

  for (const cust of customers as Record<string, unknown>[]) {
    await supabase.from("asaas_customers").upsert(
      {
        tenant_id: DEFAULT_TENANT_ID,
        asaas_id: cust.id,
        name: cust.name,
        email: cust.email || null,
        cpf_cnpj: cust.cpfCnpj || null,
        phone: cust.phone || null,
        mobile_phone: cust.mobilePhone || null,
        external_reference: cust.externalReference || null,
        raw_data: cust,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,asaas_id" }
    );
  }

  return customers.length;
}

export async function syncPaymentsFromAsaas(
  environment: "sandbox" | "production" = "sandbox"
) {
  const payments = await fetchAllFromAsaas("/payments", environment);

  for (const pay of payments as Record<string, unknown>[]) {
    await supabase.from("asaas_payments").upsert(
      {
        tenant_id: DEFAULT_TENANT_ID,
        asaas_id: pay.id,
        asaas_customer_id: pay.customer || null,
        billing_type: pay.billingType || "UNDEFINED",
        status: pay.status || "PENDING",
        value: pay.value || 0,
        net_value: pay.netValue || null,
        due_date: pay.dueDate,
        payment_date: pay.paymentDate || null,
        confirmed_date: pay.confirmedDate || null,
        invoice_url: pay.invoiceUrl || null,
        bank_slip_url: pay.bankSlipUrl || null,
        description: pay.description || null,
        external_reference: pay.externalReference || null,
        raw_data: pay,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,asaas_id" }
    );
  }

  return payments.length;
}

// ── Local DB Queries ──

export async function fetchAsaasPayments(): Promise<AsaasPayment[]> {
  const all: AsaasPayment[] = [];
  let offset = 0;
  const batchSize = 1000;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .from("asaas_payments")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .order("due_date", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...(data as AsaasPayment[]));
      offset += batchSize;
      if (data.length < batchSize) keepGoing = false;
    } else {
      keepGoing = false;
    }
  }

  return all;
}

export async function fetchAsaasCustomers(): Promise<AsaasCustomer[]> {
  const all: AsaasCustomer[] = [];
  let offset = 0;
  const batchSize = 1000;
  let keepGoing = true;

  while (keepGoing) {
    const { data, error } = await supabase
      .from("asaas_customers")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .order("name", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...(data as AsaasCustomer[]));
      offset += batchSize;
      if (data.length < batchSize) keepGoing = false;
    } else {
      keepGoing = false;
    }
  }

  return all;
}

export async function fetchDunningRules(): Promise<DunningRule[]> {
  const { data, error } = await supabase
    .from("dunning_rules")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as DunningRule[];
}

export async function upsertDunningRule(rule: Partial<DunningRule>) {
  const { error } = await supabase.from("dunning_rules").upsert({
    ...rule,
    tenant_id: DEFAULT_TENANT_ID,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchCheckoutSources(): Promise<CheckoutSource[]> {
  const { data, error } = await supabase
    .from("checkout_sources")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID);
  if (error) throw error;
  return (data || []) as CheckoutSource[];
}

export async function fetchSalesPeople(): Promise<SalesPerson[]> {
  const { data, error } = await supabase
    .from("sales_people")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID);
  if (error) throw error;
  return (data || []) as SalesPerson[];
}

export async function fetchWebhookEvents(
  limit = 50
): Promise<WebhookEvent[]> {
  const { data, error } = await supabase
    .from("webhook_events")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as WebhookEvent[];
}

// ── Dunning Executions ──

export async function fetchDunningExecutions(ruleId: string) {
  const { data, error } = await supabase
    .from("dunning_executions")
    .select("*")
    .eq("dunning_rule_id", ruleId)
    .order("executed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

// ── Dunning Simulation ──

export async function simulateDunning(
  paymentId: string,
  environment: "sandbox" | "production" = "sandbox"
) {
  return callAsaasProxy({
    endpoint: `/paymentDunnings/simulate`,
    method: "POST",
    params: { payment: paymentId },
    environment,
  });
}

// ── Payment Stats ──

export interface DateRange {
  earliest: string | null;
  latest: string | null;
}

export interface PaymentStats {
  total: number;
  received: number;
  pending: number;
  overdue: number;
  totalValue: number;
  receivedValue: number;
  pendingValue: number;
  overdueValue: number;
  byBillingType: Record<string, { count: number; value: number }>;
  receivedPeriod: DateRange;
  pendingPeriod: DateRange;
  overduePeriod: DateRange;
  totalPeriod: DateRange;
}

function updateRange(range: DateRange, date: string) {
  if (!range.earliest || date < range.earliest) range.earliest = date;
  if (!range.latest || date > range.latest) range.latest = date;
}

export function calculatePaymentStats(payments: AsaasPayment[]): PaymentStats {
  const emptyRange = (): DateRange => ({ earliest: null, latest: null });
  const stats: PaymentStats = {
    total: payments.length,
    received: 0,
    pending: 0,
    overdue: 0,
    totalValue: 0,
    receivedValue: 0,
    pendingValue: 0,
    overdueValue: 0,
    byBillingType: {},
    receivedPeriod: emptyRange(),
    pendingPeriod: emptyRange(),
    overduePeriod: emptyRange(),
    totalPeriod: emptyRange(),
  };

  for (const p of payments) {
    stats.totalValue += p.value;
    updateRange(stats.totalPeriod, p.due_date);

    if (p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH") {
      stats.received++;
      stats.receivedValue += p.value;
      updateRange(stats.receivedPeriod, p.payment_date || p.due_date);
    } else if (p.status === "OVERDUE") {
      stats.overdue++;
      stats.overdueValue += p.value;
      updateRange(stats.overduePeriod, p.due_date);
    } else if (p.status === "PENDING") {
      stats.pending++;
      stats.pendingValue += p.value;
      updateRange(stats.pendingPeriod, p.due_date);
    }

    if (!stats.byBillingType[p.billing_type]) {
      stats.byBillingType[p.billing_type] = { count: 0, value: 0 };
    }
    stats.byBillingType[p.billing_type].count++;
    stats.byBillingType[p.billing_type].value += p.value;
  }

  return stats;
}
