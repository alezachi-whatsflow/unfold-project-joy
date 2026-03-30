// ─────────────────────────────────────────────────────────────
// Pzaafi — Ledger Events Edge Function (Module C)
// Processes unprocessed webhook events, writes to ledger via RPC,
// and updates payment/order status.
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────

interface WebhookEvent {
  id: string;
  connector_id: string;
  external_event_id: string | null;
  event_type: string;
  raw_payload: Record<string, unknown>;
  normalized: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

interface ProcessResult {
  event_id: string;
  status: "processed" | "skipped" | "error";
  error?: string;
  ledger_entry_id?: string;
}

// ── Event to Ledger Mapping ─────────────────────────────────

function eventTypeToLedgerType(
  eventType: string,
): string | null {
  const map: Record<string, string> = {
    payment_confirmed: "charge_received",
    payment_received: "charge_received",
    payment_refunded: "refund",
    payment_failed: "adjustment",
    payment_cancelled: "adjustment",
    payment_overdue: "adjustment",
  };
  return map[eventType] ?? null;
}

function eventToBalanceType(eventType: string): string {
  if (eventType === "payment_confirmed" || eventType === "payment_received") {
    return "pending";
  }
  if (eventType === "payment_refunded") return "available";
  return "available";
}

function eventToPaymentStatus(eventType: string): string {
  const map: Record<string, string> = {
    payment_confirmed: "paid",
    payment_received: "paid",
    payment_refunded: "refunded",
    payment_failed: "failed",
    payment_cancelled: "cancelled",
    payment_overdue: "pending",
  };
  return map[eventType] ?? "pending";
}

function eventToOrderStatus(eventType: string): string {
  const map: Record<string, string> = {
    payment_confirmed: "paid",
    payment_received: "paid",
    payment_refunded: "refunded",
    payment_failed: "failed",
    payment_cancelled: "expired",
    payment_overdue: "pending",
  };
  return map[eventType] ?? "pending";
}

// ── Edge Function ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Fetch unprocessed webhook events (batch up to 100)
    const { data: events, error: fetchError } = await supabase
      .from("pzaafi_webhook_events")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) throw new Error(`Fetch events failed: ${fetchError.message}`);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ status: "idle", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[pzaafi-ledger-events] Processing ${events.length} events`);
    const results: ProcessResult[] = [];

    // 2. Process each event
    for (const event of events as WebhookEvent[]) {
      try {
        const normalized = event.normalized as {
          event_type?: string;
          provider_id?: string;
          amount?: number;
          connector_id?: string;
        };

        const canonicalType = normalized.event_type ?? event.event_type;
        const ledgerEventType = eventTypeToLedgerType(canonicalType);

        if (!ledgerEventType) {
          // Mark as processed but skip ledger write
          await supabase
            .from("pzaafi_webhook_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
            })
            .eq("id", event.id);

          results.push({ event_id: event.id, status: "skipped" });
          continue;
        }

        // 3. Find the payment by provider ID
        const providerId = normalized.provider_id ?? "";
        const { data: payment } = await supabase
          .from("pzaafi_payments")
          .select("id, org_id, order_id, amount_cents, fee_cents")
          .eq("external_id", providerId)
          .eq("connector_id", event.connector_id)
          .maybeSingle();

        if (!payment) {
          await supabase
            .from("pzaafi_webhook_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error: `Payment not found for provider_id=${providerId}`,
            })
            .eq("id", event.id);

          results.push({
            event_id: event.id,
            status: "error",
            error: `Payment not found: ${providerId}`,
          });
          continue;
        }

        // 4. Find (or the first) wallet for the org
        const { data: wallet } = await supabase
          .from("pzaafi_wallet_accounts")
          .select("id")
          .eq("org_id", payment.org_id)
          .eq("connector_id", event.connector_id)
          .eq("active", true)
          .limit(1)
          .maybeSingle();

        if (!wallet) {
          await supabase
            .from("pzaafi_webhook_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error: `Wallet not found for org=${payment.org_id}`,
            })
            .eq("id", event.id);

          results.push({
            event_id: event.id,
            status: "error",
            error: `Wallet not found`,
          });
          continue;
        }

        // 5. Determine amount for ledger
        const amountCents =
          canonicalType === "payment_refunded"
            ? -(normalized.amount ?? payment.amount_cents)
            : (normalized.amount ?? payment.amount_cents) -
              (payment.fee_cents ?? 0);

        // 6. Write ledger entry via RPC
        const { data: entryId, error: rpcError } = await supabase.rpc(
          "pzaafi_ledger_entry",
          {
            p_org_id: payment.org_id,
            p_wallet_id: wallet.id,
            p_event_type: ledgerEventType,
            p_amount_cents: amountCents,
            p_balance_type: eventToBalanceType(canonicalType),
            p_description: `Webhook ${canonicalType}: ${providerId}`,
            p_metadata: { webhook_event_id: event.id, raw_event: event.event_type },
            p_payment_id: payment.id,
            p_order_id: payment.order_id ?? null,
            p_settlement_id: null,
            p_refund_id: null,
            p_chargeback_id: null,
          },
        );

        if (rpcError) throw new Error(`RPC failed: ${rpcError.message}`);

        // 7. Update payment status
        const newPaymentStatus = eventToPaymentStatus(canonicalType);
        await supabase
          .from("pzaafi_payments")
          .update({
            status: newPaymentStatus,
            updated_at: new Date().toISOString(),
            ...(newPaymentStatus === "paid"
              ? { paid_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", payment.id);

        // 8. Update order status
        if (payment.order_id) {
          await supabase
            .from("pzaafi_orders")
            .update({
              status: eventToOrderStatus(canonicalType),
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.order_id);
        }

        // 9. Mark webhook event as processed
        await supabase
          .from("pzaafi_webhook_events")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        results.push({
          event_id: event.id,
          status: "processed",
          ledger_entry_id: entryId as string,
        });
      } catch (eventError: unknown) {
        const msg =
          eventError instanceof Error ? eventError.message : "Unknown error";
        console.error(
          `[pzaafi-ledger-events] Error processing event ${event.id}:`,
          msg,
        );

        await supabase
          .from("pzaafi_webhook_events")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error: msg,
          })
          .eq("id", event.id);

        results.push({ event_id: event.id, status: "error", error: msg });
      }
    }

    const processed = results.filter((r) => r.status === "processed").length;
    const errors = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    console.log(
      `[pzaafi-ledger-events] Done: ${processed} processed, ${errors} errors, ${skipped} skipped`,
    );

    return new Response(
      JSON.stringify({ status: "done", processed, errors, skipped, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[pzaafi-ledger-events] Fatal:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
