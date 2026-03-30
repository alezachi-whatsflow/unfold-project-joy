import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// ── Inline types (Deno edge function — no node_modules) ──────

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "refunded"
  | "cancelled"
  | "failed";

type AsaasChargeStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS";

interface AsaasWebhookPayment {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  netValue?: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  confirmedDate?: string;
  description?: string;
  externalReference?: string;
}

interface AsaasWebhookEvent {
  event: string;
  payment: AsaasWebhookPayment;
}

// ── Mappers (inline for Deno) ────────────────────────────────

const STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: "pending",
  RECEIVED: "received",
  CONFIRMED: "confirmed",
  OVERDUE: "overdue",
  REFUNDED: "refunded",
  RECEIVED_IN_CASH: "received",
  REFUND_REQUESTED: "pending",
  REFUND_IN_PROGRESS: "pending",
  CHARGEBACK_REQUESTED: "failed",
  CHARGEBACK_DISPUTE: "failed",
  AWAITING_CHARGEBACK_REVERSAL: "failed",
  DUNNING_REQUESTED: "overdue",
  DUNNING_RECEIVED: "received",
  AWAITING_RISK_ANALYSIS: "pending",
};

function mapStatus(s: string): PaymentStatus {
  return STATUS_MAP[s] ?? "pending";
}

function asaasToCents(value: number): number {
  return Math.round(value * 100);
}

type CanonicalEvent =
  | "payment_confirmed"
  | "payment_received"
  | "payment_overdue"
  | "payment_refunded"
  | "payment_cancelled"
  | "payment_failed";

function toCanonicalEvent(event: string): CanonicalEvent | null {
  const map: Record<string, CanonicalEvent> = {
    PAYMENT_RECEIVED: "payment_received",
    PAYMENT_CONFIRMED: "payment_confirmed",
    PAYMENT_RECEIVED_IN_CASH: "payment_received",
    PAYMENT_OVERDUE: "payment_overdue",
    PAYMENT_DELETED: "payment_cancelled",
    PAYMENT_REFUNDED: "payment_refunded",
    PAYMENT_REFUND_IN_PROGRESS: "payment_refunded",
    PAYMENT_CHARGEBACK_REQUESTED: "payment_failed",
    PAYMENT_CHARGEBACK_DISPUTE: "payment_failed",
  };
  return map[event] ?? null;
}

// ── Edge Function ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Validate webhook token
    const incomingToken = req.headers.get("asaas-access-token") ?? "";
    if (expectedToken && incomingToken !== expectedToken) {
      console.warn("[pzaafi-webhook-asaas] Invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: AsaasWebhookEvent = await req.json();
    const { event, payment } = payload;

    console.log(
      `[pzaafi-webhook-asaas] event=${event} payment=${payment.id} status=${payment.status}`,
    );

    // 2. Idempotency check via pzaafi_webhook_events
    const idempotencyKey = `asaas:${payment.id}:${event}`;
    const { data: existing } = await supabase
      .from("pzaafi_webhook_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      console.log(`[pzaafi-webhook-asaas] Duplicate ${idempotencyKey}, skipping`);
      return new Response(JSON.stringify({ status: "duplicate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Store raw event
    await supabase.from("pzaafi_webhook_events").insert({
      connector_id: "asaas",
      idempotency_key: idempotencyKey,
      event_type: event,
      provider_id: payment.id,
      payload,
      processed: false,
    });

    // 4. Normalize event
    const canonicalEvent = toCanonicalEvent(event);
    if (!canonicalEvent) {
      console.log(`[pzaafi-webhook-asaas] Ignoring event: ${event}`);
      await supabase
        .from("pzaafi_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("idempotency_key", idempotencyKey);
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Update pzaafi_payments by provider_id
    const newStatus = mapStatus(payment.status);
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "received" || newStatus === "confirmed") {
      updatePayload.paid_at =
        payment.confirmedDate ?? payment.paymentDate ?? new Date().toISOString();
      updatePayload.net =
        payment.netValue != null ? asaasToCents(payment.netValue) : undefined;
    }

    const { data: updatedPayment } = await supabase
      .from("pzaafi_payments")
      .update(updatePayload)
      .eq("provider_id", payment.id)
      .eq("connector_id", "asaas")
      .select("id, order_id, amount")
      .maybeSingle();

    // 6. Update pzaafi_orders status if payment found
    if (updatedPayment?.order_id) {
      let orderStatus: string;
      if (newStatus === "received" || newStatus === "confirmed") {
        orderStatus = "paid";
      } else if (newStatus === "refunded") {
        orderStatus = "refunded";
      } else if (newStatus === "cancelled" || newStatus === "failed") {
        orderStatus = "cancelled";
      } else {
        orderStatus = "open";
      }

      await supabase
        .from("pzaafi_orders")
        .update({
          status: orderStatus,
          paid: newStatus === "received" || newStatus === "confirmed"
            ? updatedPayment.amount
            : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedPayment.order_id);
    }

    // 7. Mark event as processed
    await supabase
      .from("pzaafi_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("idempotency_key", idempotencyKey);

    console.log(
      `[pzaafi-webhook-asaas] Processed ${canonicalEvent} for ${payment.id}`,
    );

    return new Response(
      JSON.stringify({ status: "processed", event: canonicalEvent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[pzaafi-webhook-asaas] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
